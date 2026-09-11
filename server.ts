import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '5mb' }));

function getGenAI(customKey?: string): GoogleGenAI | null {
  const apiKey = customKey || process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Generate content with model fallback when upstream experiences high demand (503)
async function generateWithModelFallback(
  ai: GoogleGenAI,
  params: {
    contents: any;
    config?: any;
  }
): Promise<{ text: string; modelUsed: string }> {
  // Primary model and secondary fast fallback model
  const models = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];
  let lastError: any = null;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      const res = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
      return {
        text: res.text || '',
        modelUsed: model,
      };
    } catch (err: any) {
      lastError = err;
      const isTransient =
        err?.status === 503 ||
        err?.code === 503 ||
        err?.status === 429 ||
        err?.code === 429 ||
        String(err?.message || '').includes('503') ||
        String(err?.message || '').includes('high demand') ||
        String(err?.message || '').includes('UNAVAILABLE') ||
        String(err?.message || '').includes('resource exhausted');

      if (isTransient && i < models.length - 1) {
        console.log(`[AI Coach] Model ${model} is experiencing temporary high demand. Seamlessly trying ${models[i + 1]}...`);
        // Short pause before switching to avoid hammering upstream
        await new Promise((resolve) => setTimeout(resolve, 500));
        continue;
      }
      break;
    }
  }

  throw lastError;
}

function getServerTargetRepBracket(name: string, category?: string): { minReps: number; maxReps: number } {
  const norm = (name || '').toLowerCase().trim();
  if (norm.includes('deadlift') && !norm.includes('romanian') && !norm.includes('rdl')) {
    return { minReps: 5, maxReps: 6 };
  }
  if (norm.includes('squat') && (norm.includes('back') || norm.includes('barbell'))) {
    return { minReps: 6, maxReps: 8 };
  }
  if (
    norm.includes('bench press') ||
    norm.includes('overhead press') ||
    norm.includes('military press') ||
    norm.includes('chest-supported row') ||
    norm.includes('barbell row') ||
    norm.includes('bent-over row')
  ) {
    return { minReps: 8, maxReps: 10 };
  }
  if (
    norm.includes('lateral raise') ||
    norm.includes('face pull') ||
    norm.includes('cable pushdown') ||
    norm.includes('triceps pushdown') ||
    norm.includes('extension') ||
    norm.includes('rear delt') ||
    norm.includes('calf') ||
    norm.includes('shrug')
  ) {
    return { minReps: 12, maxReps: 15 };
  }
  return { minReps: 10, maxReps: 12 };
}

// Robust fallback critique generator when external API is undergoing high demand
function generateServerFallbackCritique(workout: any) {
  const durationMin = Math.max(1, Math.round((workout.durationSeconds || 0) / 60));
  const totalVolume = Number(workout.totalVolume) || 0;
  const unit = workout.unit || 'lbs';
  const setsCount = Number(workout.completedSetsCount) || 0;
  const exercises = workout.exercises || [];
  const titleLower = (workout.title || '').toLowerCase();

  const whatYouDidRight: string[] = [
    `Logged ${setsCount} completed sets across ${exercises.length} exercises with high volume adherence.`,
    `Moved ${totalVolume.toLocaleString()} ${unit} total volume over ${durationMin} minutes (${Math.round(totalVolume / durationMin)} ${unit}/min density).`,
  ];

  const areasToImprove: string[] = [];

  const overloadAdvice = exercises.map((ex: any) => {
    const validSets = (ex.sets || []).filter((s: any) => s.completed && Number(s.reps) > 0);
    const maxWeight =
      validSets.length > 0 ? Math.max(...validSets.map((s: any) => Number(s.weight) || 0)) : 0;
    const reps = validSets.map((s: any) => Number(s.reps));
    const isLower = ['Legs'].includes(ex.category) || ex.name.toLowerCase().includes('squat') || ex.name.toLowerCase().includes('deadlift');
    const inc = unit === 'lbs' ? (isLower ? 10 : 5) : (isLower ? 5 : 2.5);

    const { minReps, maxReps } = getServerTargetRepBracket(ex.name, ex.category);
    const isGraduated = reps.length >= 2 && reps.every((r: number) => r >= maxReps);

    if (isGraduated) {
      whatYouDidRight.push(
        `Max rep bracket cleared on ${ex.name}: ${reps.join(', ')} reps! Cleared all ${maxReps} reps across sets.`
      );
      return {
        exerciseName: ex.name,
        status: 'ready_to_increase',
        advice: `Graduated at ${maxWeight} ${unit}! Bump working load by +${inc} ${unit} to ${
          maxWeight + inc
        } ${unit} next session and reset target to ${minReps} reps.`,
      };
    } else if (reps.some((r: number) => r >= minReps)) {
      return {
        exerciseName: ex.name,
        status: 'hold_and_build_reps',
        advice: `Solid working base at ${maxWeight} ${unit} (${reps.join(', ')} reps). Target bracket is ${minReps}–${maxReps} reps. Hold load at ${maxWeight} ${unit} and build reps until hitting ${maxReps} across all sets to graduate.`,
      };
    } else {
      if (reps.length >= 2 && reps[reps.length - 1] < reps[0] - 2) {
        areasToImprove.push(
          `Noticeable rep drop-off on ${ex.name} (${reps.join(', ')} reps). Extend your rest interval to the full prescribed time.`
        );
      }
      return {
        exerciseName: ex.name,
        status: 'refine_form',
        advice: `Rest at least 90–120s between sets at ${maxWeight} ${unit}. Control 3-second eccentric tempo and aim for ${minReps} reps before adding load.`,
      };
    }
  });

  if (areasToImprove.length === 0) {
    areasToImprove.push('Ensure rest intervals are disciplined (2 min for heavy compounds, 90s for rows, 60s for isolations).');
    areasToImprove.push('Prioritize full extension and deep eccentric stretch on all repetitions before adding weight.');
  }

  // Determine next prescribed workout:
  // ONLY if the user followed Workout A, B, or C do we rotate the 3-day cycle:
  // Workout A -> Workout B -> Workout C -> Workout A
  // If it was a Freestyle or custom workout, prescribe a dedicated Freestyle recovery session
  // targeting fresh/antagonist muscle groups, rather than forcing Workout A, B, or C!
  let nextSplitTitle = '';
  let nextSplitId = '';
  let nextTargetMuscles: string[] = [];
  let nextRecoveryAdvice = 'Allow 48 hours for muscle protein synthesis and CNS recovery before your next session.';
  let nextExercises: any[] = [];

  const isWorkoutA = titleLower.includes('workout a') || titleLower.includes('squat & horizontal');
  const isWorkoutB = titleLower.includes('workout b') || titleLower.includes('hinge & vertical');
  const isWorkoutC = titleLower.includes('workout c') || titleLower.includes('hypertrophy & unilateral');

  if (isWorkoutA) {
    nextSplitTitle = 'Workout B: Hinge & Vertical Push/Pull';
    nextSplitId = 'workout-b';
    nextTargetMuscles = ['Legs', 'Back', 'Shoulders'];
    nextExercises = [
      {
        exerciseName: 'Conventional Deadlift',
        category: 'Legs',
        targetSets: 3,
        targetReps: '5–6 reps',
        targetWeight: 'Starting weight',
        restDuration: '2–3 min rest',
        restSeconds: 150,
        doubleProgressionNote: 'Heavy posterior chain hinge. Target 5 reps on all 3 sets before increasing load.',
      },
      {
        exerciseName: 'Overhead Press',
        category: 'Shoulders',
        targetSets: 3,
        targetReps: '8–10 reps',
        targetWeight: 'Starting weight',
        restDuration: '2 min rest',
        restSeconds: 120,
        doubleProgressionNote: 'Vertical press foundation. Lock out elbows overhead with active core brace.',
      },
      {
        exerciseName: 'Lat Pulldown',
        category: 'Back',
        targetSets: 3,
        targetReps: '8–12 reps',
        targetWeight: 'Starting weight',
        restDuration: '90 sec rest',
        restSeconds: 90,
        doubleProgressionNote: 'Drive elbows down to hips; pause 1 second at chest before control on the eccentric.',
      },
      {
        exerciseName: 'Leg Press',
        category: 'Legs',
        targetSets: 3,
        targetReps: '10–12 reps',
        targetWeight: 'Starting weight',
        restDuration: '90 sec rest',
        restSeconds: 90,
        doubleProgressionNote: 'Unilateral or bilateral leg volume. Deep knee bend without lumbar flexion.',
      },
      {
        exerciseName: 'Dumbbell Lateral Raise',
        category: 'Shoulders',
        targetSets: 3,
        targetReps: '12–15 reps',
        targetWeight: 'Starting weight',
        restDuration: '60 sec rest',
        restSeconds: 60,
        doubleProgressionNote: 'Lead with elbows and slight forward lean; hold top contraction for 1 sec.',
      },
      {
        exerciseName: 'Hanging Knee Raise',
        category: 'Core',
        targetSets: 3,
        targetReps: '12–15 reps',
        targetWeight: 'Bodyweight',
        restDuration: '60 sec rest',
        restSeconds: 60,
        doubleProgressionNote: 'Control swing; curl pelvis upward toward chest for maximum rectus abdominis flexion.',
      },
    ];
  } else if (isWorkoutB) {
    nextSplitTitle = 'Workout C: Hypertrophy & Unilateral Focus';
    nextSplitId = 'workout-c';
    nextTargetMuscles = ['Legs', 'Chest', 'Back', 'Shoulders', 'Arms'];
    nextExercises = [
      {
        exerciseName: 'Front Squat',
        category: 'Legs',
        targetSets: 3,
        targetReps: '8–10 reps',
        targetWeight: 'Starting weight',
        restDuration: '2 min rest',
        restSeconds: 120,
        doubleProgressionNote: 'Upright torso and deep quad bend. Hit 10 reps on all sets to graduate load.',
      },
      {
        exerciseName: 'Incline Dumbbell Bench Press',
        category: 'Chest',
        targetSets: 3,
        targetReps: '8–12 reps',
        targetWeight: 'Starting weight',
        restDuration: '90 sec rest',
        restSeconds: 90,
        doubleProgressionNote: 'Upper chest focus at 30-degree angle. Full stretch at bottom.',
      },
      {
        exerciseName: 'One-Arm Dumbbell Row',
        category: 'Back',
        targetSets: 3,
        targetReps: '8–12 reps',
        targetWeight: 'Starting weight',
        restDuration: '90 sec rest',
        restSeconds: 90,
        doubleProgressionNote: 'Per side. Pull toward hip crease for lat engagement.',
      },
      {
        exerciseName: 'Lying Hamstring Leg Curl',
        category: 'Legs',
        targetSets: 3,
        targetReps: '10–12 reps',
        targetWeight: 'Starting weight',
        restDuration: '60–90 sec rest',
        restSeconds: 75,
        doubleProgressionNote: 'Isolate hamstrings; keep hips pressed firmly into pad.',
      },
      {
        exerciseName: 'Dumbbell Lateral Raise',
        category: 'Shoulders',
        targetSets: 3,
        targetReps: '12–15 reps',
        targetWeight: 'Starting weight',
        restDuration: '60 sec rest',
        restSeconds: 60,
        doubleProgressionNote: 'High repetition pump work for lateral deltoid growth.',
      },
      {
        exerciseName: 'Dumbbell Hammer Curl',
        category: 'Biceps',
        targetSets: 3,
        targetReps: '10–12 reps',
        targetWeight: 'Starting weight',
        restDuration: '60 sec rest',
        restSeconds: 60,
        doubleProgressionNote: 'Targets brachialis and forearm flexors with neutral grip.',
      },
      {
        exerciseName: 'Overhead Cable Triceps Extension',
        category: 'Triceps',
        targetSets: 3,
        targetReps: '12–15 reps',
        targetWeight: 'Starting weight',
        restDuration: '60 sec rest',
        restSeconds: 60,
        doubleProgressionNote: 'Deep long-head triceps stretch under continuous cable tension.',
      },
    ];
  } else if (isWorkoutC) {
    nextSplitTitle = 'Workout A: Squat & Horizontal Push/Pull';
    nextSplitId = 'workout-a';
    nextTargetMuscles = ['Legs', 'Chest', 'Back', 'Arms'];
    nextExercises = [
      {
        exerciseName: 'Barbell Back Squat',
        category: 'Legs',
        targetSets: 3,
        targetReps: '6–8 reps',
        targetWeight: 'Starting weight',
        restDuration: '2 min rest',
        restSeconds: 120,
        doubleProgressionNote: 'Primary heavy squat foundation. Hit 8 reps across all 3 sets before increasing load.',
      },
      {
        exerciseName: 'Barbell Bench Press',
        category: 'Chest',
        targetSets: 3,
        targetReps: '8–10 reps',
        targetWeight: 'Starting weight',
        restDuration: '2 min rest',
        restSeconds: 120,
        doubleProgressionNote: 'Controlled descent to mid-chest. Double progression triggers at 3 sets of 10 reps.',
      },
      {
        exerciseName: 'Chest-Supported Row',
        category: 'Back',
        targetSets: 3,
        targetReps: '8–10 reps',
        targetWeight: 'Starting weight',
        restDuration: '90 sec rest',
        restSeconds: 90,
        doubleProgressionNote: 'Squeeze shoulder blades together; full stretch on negative.',
      },
      {
        exerciseName: 'Romanian Deadlift',
        category: 'Legs',
        targetSets: 3,
        targetReps: '10–12 reps',
        targetWeight: 'Starting weight',
        restDuration: '90 sec rest',
        restSeconds: 90,
        doubleProgressionNote: 'Hip hinge exercise. Push hips back until deep hamstring tension is reached.',
      },
      {
        exerciseName: 'Incline Dumbbell Bicep Curl',
        category: 'Biceps',
        targetSets: 3,
        targetReps: '10–12 reps',
        targetWeight: 'Starting weight',
        restDuration: '60 sec rest',
        restSeconds: 60,
        doubleProgressionNote: 'Incline bench position isolates the long head of the biceps.',
      },
      {
        exerciseName: 'Triceps Cable Pushdown',
        category: 'Triceps',
        targetSets: 3,
        targetReps: '12–15 reps',
        targetWeight: 'Starting weight',
        restDuration: '60 sec rest',
        restSeconds: 60,
        doubleProgressionNote: 'Keep elbows locked at sides and fully extend through the triceps.',
      },
    ];
  } else {
    // FREESTYLE / CUSTOM SESSION: Prescribe complementary muscle recovery without forcing Workout A/B/C!
    const workedCategories = new Set(
      (workout.exercises || []).map((e: any) => e.category).filter(Boolean)
    );
    const hasPush = workedCategories.has('Chest') || workedCategories.has('Triceps') || workedCategories.has('Shoulders');
    const hasPull = workedCategories.has('Back') || workedCategories.has('Biceps');
    const hasLegs = workedCategories.has('Legs');

    nextSplitId = 'freestyle-custom';

    if (hasPush && !hasPull && !hasLegs) {
      nextSplitTitle = 'Freestyle: Back, Biceps & Posterior Chain (Pull & Hinge)';
      nextTargetMuscles = ['Back', 'Biceps', 'Legs'];
      nextRecoveryAdvice = 'Push fibers (chest, triceps, shoulders) are in recovery. Target antagonist pull and posterior chain.';
      nextExercises = [
        {
          exerciseName: 'Lat Pulldown',
          category: 'Back',
          targetSets: 3,
          targetReps: '8–12 reps',
          targetWeight: 'Starting weight',
          restDuration: '90 sec rest',
          restSeconds: 90,
          doubleProgressionNote: 'Drive elbows straight down. Target 12 reps on all sets before increasing load.',
        },
        {
          exerciseName: 'Romanian Deadlift',
          category: 'Legs',
          targetSets: 3,
          targetReps: '8–10 reps',
          targetWeight: 'Starting weight',
          restDuration: '90 sec rest',
          restSeconds: 90,
          doubleProgressionNote: 'Target hamstring stretch and hip hinge.',
        },
        {
          exerciseName: 'One-Arm Dumbbell Row',
          category: 'Back',
          targetSets: 3,
          targetReps: '8–12 reps',
          targetWeight: 'Starting weight',
          restDuration: '90 sec rest',
          restSeconds: 90,
          doubleProgressionNote: 'Unilateral lat development.',
        },
        {
          exerciseName: 'Incline Dumbbell Bicep Curl',
          category: 'Biceps',
          targetSets: 3,
          targetReps: '10–12 reps',
          targetWeight: 'Starting weight',
          restDuration: '60 sec rest',
          restSeconds: 60,
          doubleProgressionNote: 'Isolate elbow flexors through full stretch.',
        },
      ];
    } else if (hasLegs && !hasPush && !hasPull) {
      nextSplitTitle = 'Freestyle: Upper Body Push & Pull Antagonists';
      nextTargetMuscles = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps'];
      nextRecoveryAdvice = 'Allow 48 hours for lower body motor units to recover. Shift to upper body horizontal and vertical pressing.';
      nextExercises = [
        {
          exerciseName: 'Barbell Bench Press',
          category: 'Chest',
          targetSets: 3,
          targetReps: '8–10 reps',
          targetWeight: 'Starting weight',
          restDuration: '2 min rest',
          restSeconds: 120,
          doubleProgressionNote: 'Controlled descent. Graduate at 3x10.',
        },
        {
          exerciseName: 'Chest-Supported Row',
          category: 'Back',
          targetSets: 3,
          targetReps: '8–10 reps',
          targetWeight: 'Starting weight',
          restDuration: '90 sec rest',
          restSeconds: 90,
          doubleProgressionNote: 'Upper back thickness.',
        },
        {
          exerciseName: 'Overhead Press',
          category: 'Shoulders',
          targetSets: 3,
          targetReps: '8–10 reps',
          targetWeight: 'Starting weight',
          restDuration: '2 min rest',
          restSeconds: 120,
          doubleProgressionNote: 'Vertical pressing strength.',
        },
        {
          exerciseName: 'Triceps Cable Pushdown',
          category: 'Triceps',
          targetSets: 3,
          targetReps: '12–15 reps',
          targetWeight: 'Starting weight',
          restDuration: '60 sec rest',
          restSeconds: 60,
          doubleProgressionNote: 'Target 15 reps on all sets to bump pin.',
        },
      ];
    } else {
      nextSplitTitle = 'Freestyle: Active Recovery & Weak Point Focus';
      nextTargetMuscles = ['Shoulders', 'Arms', 'Core'];
      nextRecoveryAdvice = 'Full body stimulus logged today. Allow 48 hours for CNS rest before your next heavy session.';
      nextExercises = [
        {
          exerciseName: 'Dumbbell Lateral Raise',
          category: 'Shoulders',
          targetSets: 3,
          targetReps: '12–15 reps',
          targetWeight: 'Starting weight',
          restDuration: '60 sec rest',
          restSeconds: 60,
          doubleProgressionNote: 'Strict form; pause at apex.',
        },
        {
          exerciseName: 'Dumbbell Hammer Curl',
          category: 'Biceps',
          targetSets: 3,
          targetReps: '10–12 reps',
          targetWeight: 'Starting weight',
          restDuration: '60 sec rest',
          restSeconds: 60,
          doubleProgressionNote: 'Brachialis hypertrophy.',
        },
        {
          exerciseName: 'Overhead Cable Triceps Extension',
          category: 'Triceps',
          targetSets: 3,
          targetReps: '12–15 reps',
          targetWeight: 'Starting weight',
          restDuration: '60 sec rest',
          restSeconds: 60,
          doubleProgressionNote: 'Long head stretch.',
        },
        {
          exerciseName: 'Hanging Knee Raise',
          category: 'Core',
          targetSets: 3,
          targetReps: '12–15 reps',
          targetWeight: 'Bodyweight',
          restDuration: '60 sec rest',
          restSeconds: 60,
          doubleProgressionNote: 'Controlled pelvic curl.',
        },
      ];
    }
  }

  return {
    headline: `Strong session logged! ${totalVolume.toLocaleString()} ${unit} moved with clean volume density.`,
    whatYouDidRight,
    areasToImprove,
    highlights: whatYouDidRight,
    progressiveOverloadAdvice: overloadAdvice,
    prescribedNextWorkout: {
      recommendedSplit: nextSplitTitle,
      splitId: nextSplitId,
      targetMuscleGroups: nextTargetMuscles.length > 0 ? nextTargetMuscles : ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms'],
      recoveryHours: 48,
      recoveryAdvice: nextRecoveryAdvice,
      exercises: nextExercises,
    },
    coachNote: 'Stick to the double progression model: hit the ceiling of your rep range on all sets, then bump the weight!',
  };
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasServerKey: !!process.env.GEMINI_API_KEY,
  });
});

// Workout Critique endpoint
app.post('/api/workout-critique', async (req, res) => {
  const { workout, userKey } = req.body;
  if (!workout) {
    return res.status(400).json({ error: 'Workout data is required' });
  }

  const ai = getGenAI(userKey);
  if (!ai) {
    return res.status(200).json({
      success: true,
      critique: generateServerFallbackCritique(workout),
      source: 'offline_engine',
      fallback: true,
      message: 'No API key configured. Using offline intelligence engine.',
    });
  }

  try {
    const prompt = `You are the head strength & conditioning coach for LogX, an elite fitness tracking app.
Analyze the completed gym workout below and provide a concise, sharp, highly actionable critique, following the Double Progression Model and the user's 3-Day Full Body Routine:
- Workout A: Squat & Horizontal Push/Pull (Barbell Back Squat, Barbell Bench Press, Chest-Supported Row, Romanian Deadlift, Incline Dumbbell Bicep Curl, Triceps Cable Pushdown)
- Workout B: Hinge & Vertical Push/Pull (Conventional Deadlift, Overhead Press, Lat Pulldown, Leg Press, Dumbbell Lateral Raise, Hanging Knee Raise)
- Workout C: Hypertrophy & Unilateral Focus (Front Squat, Incline Dumbbell Bench Press, One-Arm Dumbbell Row, Lying Hamstring Leg Curl, Dumbbell Lateral Raise, Dumbbell Hammer Curl, Overhead Cable Triceps Extension)

Double Progression Model Rules:
1. Exact Target Rep Brackets:
   - Barbell Back Squat: 6–8 reps (Graduate ONLY if hitting 8 reps across all sets)
   - Barbell Bench Press, Overhead Press, Chest-Supported Row: 8–10 reps (Graduate ONLY if hitting 10 reps across all sets. Hitting 8 reps is the starting baseline floor, NOT graduation! Do NOT graduate someone at 8 reps on Bench Press!)
   - Romanian Deadlift, Leg Press, Bicep Curls: 10–12 reps (Graduate ONLY at 12 reps across all sets)
   - Cable Pushdowns, Lateral Raises: 12–15 reps (Graduate ONLY at 15 reps across all sets)
2. If the lifter reached or exceeded the ceiling (e.g., 10 reps on Bench Press, 8 on Squats) on all completed working sets with solid form, declare "Graduated" and prescribe +5 lbs (+10 lbs for heavy lower body compounds) for the next session, resetting reps to the lower bound of the bracket.
3. If they hit the bottom floor (e.g. 8 reps on Bench Press) but not the ceiling (10 reps), DO NOT declare graduated. Set status to "hold_and_build_reps" and instruct them to hold the load and build reps towards the ceiling on all sets.

Next Workout Prescription Rules:
- If the workout completed was Workout A, prescribe Workout B (splitId: "workout-b").
- If the workout completed was Workout B, prescribe Workout C (splitId: "workout-c").
- If the workout completed was Workout C, prescribe Workout A (splitId: "workout-a").
- If the completed workout was a Freestyle or custom session (NOT Workout A, B, or C): DO NOT prescribe Workout A, B, or C. Instead, prescribe a tailored "Freestyle: [Fresh Muscle Groups] Focus" with splitId: "freestyle-custom" targeting the complementary/rested muscle groups with 48h recovery advice!

WORKOUT DATA:
Title: ${workout.title || 'Workout'}
Duration: ${workout.durationFormatted || `${Math.round((workout.durationSeconds || 0) / 60)} minutes`}
Total Volume: ${workout.totalVolume || 0} ${workout.unit || 'lbs'}
Total Sets: ${workout.completedSetsCount || 0}
Exercises:
${(workout.exercises || [])
  .map(
    (ex: any) =>
      `- ${ex.name} (${ex.category}):
  Sets: ${(ex.sets || [])
    .map(
      (s: any, idx: number) =>
        `#${idx + 1}: ${s.weight}${workout.unit || 'lbs'} x ${s.reps} reps ${s.completed ? '[DONE]' : '[MISSED]'}${s.previous ? ` (Previous was: ${s.previous})` : ''}`
    )
    .join(', ')}`
  )
  .join('\n')}

Format your response strictly in valid JSON matching this exact structure:
{
  "headline": "Brief punchy 1-sentence coach evaluation",
  "whatYouDidRight": [
    "Highlight specific achievement, volume, rep PR, or consistency win",
    "Highlight another specific exercise accomplishment"
  ],
  "areasToImprove": [
    "Constructive critique on pacing, rest periods, rep drop-off or tempo",
    "Another actionable area for improvement"
  ],
  "highlights": ["Win 1", "Win 2"],
  "progressiveOverloadAdvice": [
    {
      "exerciseName": "Exercise name",
      "status": "ready_to_increase | hold_and_build_reps | refine_form",
      "advice": "Specific double progression advice (e.g. Bump +5 lbs next time vs hold weight and build reps)"
    }
  ],
  "prescribedNextWorkout": {
    "recommendedSplit": "The next routine in the 3-day cycle (e.g. Workout B: Hinge & Vertical Push/Pull)",
    "splitId": "workout-a | workout-b | workout-c",
    "targetMuscleGroups": ["Legs", "Back", "Shoulders"],
    "recoveryHours": 48,
    "recoveryAdvice": "Key focus for nutrition and central nervous system recovery",
    "exercises": [
      {
        "exerciseName": "Exercise Name",
        "category": "Legs | Chest | Back | Shoulders | Biceps | Triceps | Core",
        "targetSets": 3,
        "targetReps": "e.g. 8–10 reps",
        "targetWeight": "Numeric weight or Starting load",
        "restDuration": "e.g. 2 min rest or 90 sec rest",
        "restSeconds": 120,
        "doubleProgressionNote": "Specific double progression target rationale"
      }
    ]
  },
  "coachNote": "Closing mentor advice"
}`;

    const { text, modelUsed } = await generateWithModelFallback(ai, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.4,
      },
    });

    let parsedData;
    try {
      parsedData = JSON.parse(text);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Unable to parse JSON from AI response');
      }
    }

    return res.json({
      success: true,
      critique: parsedData,
      source: modelUsed,
    });
  } catch (error: any) {
    // Seamlessly provide analytical coaching critique if upstream is at peak capacity
    console.log('[AI Coach] Serving analytical offline critique engine.');
    return res.status(200).json({
      success: true,
      critique: generateServerFallbackCritique(workout),
      source: 'offline_engine',
      fallback: true,
      notice: 'Precision offline critique generated.',
    });
  }
});

// AI Coach Chat endpoint
app.post('/api/chat', async (req, res) => {
  const { messages, userKey, workoutContext } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  const ai = getGenAI(userKey);
  if (!ai) {
    return res.status(200).json({
      fallback: true,
      reply:
        "I'm currently running in offline mode. For live interactive coaching with Gemini, you can provide an API key in Settings. Meanwhile, you can check your workout critiques in the History and AI Coach tabs!",
    });
  }

  try {
    const systemPrompt = `You are LogX AI, an elite, encouraging, scientifically grounded strength coach and gym mentor.
You specialize in progressive overload, hypertrophy, strength programming, exercise technique, rest intervals, and muscle recovery.
Keep advice practical, safe, and direct. Avoid generic filler.
${workoutContext ? `Current athlete context: ${JSON.stringify(workoutContext)}` : ''}`;

    const contents = messages.map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const { text, modelUsed } = await generateWithModelFallback(ai, {
      contents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      },
    });

    return res.json({
      success: true,
      reply: text || "Keep pushing hard! Let's get that progressive overload.",
      source: modelUsed,
    });
  } catch (error: any) {
    console.log('[AI Coach] Upstream busy, serving offline coaching knowledge.');
    return res.status(200).json({
      fallback: true,
      reply:
        'To sustain progressive overload: once you can complete your upper rep target across all working sets, increase resistance by 2.5% to 5% on your next workout and rebuild your reps. Keep 2–3 minutes rest on compound lifts.',
      source: 'offline_engine',
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LogX Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
