import {
  CompletedWorkout,
  ExerciseProgressionStatus,
  MuscleCategory,
  NextWorkoutExercisePrescription,
  PrescribedNextWorkout,
  ProgressiveOverloadItem,
  TrainingRoutine,
  WeightUnit,
} from '../types';
import { TRAINING_ROUTINES } from '../data/trainingPlans';

// Helper to parse rep range e.g. "8–10 reps" or "10–12 reps per leg" or "5–6 reps"
export function parseRepBracket(targetRepsStr: string): { minReps: number; maxReps: number } {
  const match = targetRepsStr.match(/(\d+)\s*[-–—]\s*(\d+)/);
  if (match) {
    return {
      minReps: parseInt(match[1], 10),
      maxReps: parseInt(match[2], 10),
    };
  }
  const singleMatch = targetRepsStr.match(/(\d+)/);
  if (singleMatch) {
    const val = parseInt(singleMatch[1], 10);
    return { minReps: val, maxReps: val };
  }
  return { minReps: 8, maxReps: 12 };
}

// Lookup or infer the target rep bracket for an exercise
export function getExerciseTargetRepBracket(
  exerciseName: string,
  category?: MuscleCategory
): { minReps: number; maxReps: number } {
  const normName = exerciseName.toLowerCase().trim();

  // 1. Exact match in training routines
  for (const routine of TRAINING_ROUTINES) {
    const found = routine.exercises.find(
      (e) => e.name.toLowerCase().trim() === normName
    );
    if (found && found.targetReps) {
      return parseRepBracket(found.targetReps);
    }
  }

  // 2. Substring match in training routines
  for (const routine of TRAINING_ROUTINES) {
    const found = routine.exercises.find((e) => {
      const eNorm = e.name.toLowerCase().trim();
      return normName.includes(eNorm) || eNorm.includes(normName);
    });
    if (found && found.targetReps) {
      return parseRepBracket(found.targetReps);
    }
  }

  // 3. Exercise pattern heuristics
  if (normName.includes('deadlift') && !normName.includes('romanian') && !normName.includes('rdl')) {
    return { minReps: 5, maxReps: 6 }; // Heavy deadlift
  }
  if (normName.includes('squat') && (normName.includes('back') || normName.includes('barbell'))) {
    return { minReps: 6, maxReps: 8 }; // Heavy back squat
  }
  if (
    normName.includes('bench press') ||
    normName.includes('overhead press') ||
    normName.includes('military press') ||
    normName.includes('chest-supported row') ||
    normName.includes('barbell row') ||
    normName.includes('bent-over row')
  ) {
    return { minReps: 8, maxReps: 10 }; // Primary compound presses & rows (Graduate at 10 reps!)
  }
  if (
    normName.includes('lateral raise') ||
    normName.includes('face pull') ||
    normName.includes('cable pushdown') ||
    normName.includes('triceps pushdown') ||
    normName.includes('extension') ||
    normName.includes('rear delt') ||
    normName.includes('calf') ||
    normName.includes('shrug')
  ) {
    return { minReps: 12, maxReps: 15 }; // Small muscle isolation (Graduate at 15 reps)
  }

  // Default hypertrophy range (e.g. curls, leg press, lunges, rdl, lat pulldown)
  return { minReps: 10, maxReps: 12 };
}

// Determine if an exercise is a heavy lower body compound
function isHeavyLowerCompound(name: string, category: MuscleCategory): boolean {
  const lower = name.toLowerCase();
  return (
    lower.includes('squat') ||
    lower.includes('deadlift') ||
    lower.includes('leg press') ||
    (category === 'Legs' && !lower.includes('curl') && !lower.includes('extension'))
  );
}

// Find previous session records for an exercise
export function getExerciseHistoryRecord(
  exerciseName: string,
  workoutsHistory: CompletedWorkout[]
) {
  if (!workoutsHistory || workoutsHistory.length === 0) return null;
  const sorted = [...workoutsHistory].sort((a, b) => b.endTime - a.endTime);

  for (const w of sorted) {
    const matched = w.exercises.find(
      (e) => e.name.toLowerCase().trim() === exerciseName.toLowerCase().trim()
    );
    if (matched && matched.sets && matched.sets.length > 0) {
      const validSets = matched.sets.filter(
        (s) => s.completed && typeof s.weight === 'number' && typeof s.reps === 'number' && s.reps > 0
      );
      if (validSets.length > 0) {
        return {
          workoutDate: w.endTime,
          unit: w.unit,
          sets: validSets,
          maxWeight: Math.max(...validSets.map((s) => Number(s.weight))),
          minWeight: Math.min(...validSets.map((s) => Number(s.weight))),
          avgReps:
            validSets.reduce((sum, s) => sum + Number(s.reps), 0) / validSets.length,
          allReps: validSets.map((s) => Number(s.reps)),
          repCount: validSets.length,
        };
      }
    }
  }
  return null;
}

// Evaluates double progression readiness and provides in-workout reminders
export function getExerciseProgressionStatus(
  exerciseName: string,
  category: MuscleCategory,
  workoutsHistory: CompletedWorkout[],
  unit: WeightUnit = 'lbs'
): ExerciseProgressionStatus {
  const { minReps, maxReps } = getExerciseTargetRepBracket(exerciseName, category);
  const isLower = isHeavyLowerCompound(exerciseName, category);
  const weightInc = unit === 'lbs' ? (isLower ? 10 : 5) : (isLower ? 5 : 2.5);
  const history = getExerciseHistoryRecord(exerciseName, workoutsHistory);

  if (!history || history.sets.length === 0) {
    return {
      isGraduated: false,
      minReps,
      maxReps,
      currentWeight: null,
      suggestedWeight: null,
      weightInc,
      lastReps: [],
      message: `Target: ${minReps}–${maxReps} reps · Hit ${maxReps} on all sets to bump +${weightInc} ${unit}`,
    };
  }

  const currentWeight = history.maxWeight;
  const lastReps = history.allReps;
  // Double progression graduation requirement:
  // Must have completed at least 2 working sets, and EVERY set must hit or exceed the ceiling (maxReps)
  const isGraduated = lastReps.length >= 2 && lastReps.every((r) => r >= maxReps);
  const suggestedWeight = isGraduated ? currentWeight + weightInc : currentWeight;

  let message = '';
  if (isGraduated) {
    message = `⚡ Ready to increase: Bump weight by +${weightInc} ${unit} to ${suggestedWeight} ${unit}! (Aim for ${minReps} reps)`;
  } else {
    message = `Target: ${minReps}–${maxReps} reps at ${currentWeight} ${unit} · Hit ${maxReps} reps on all sets to bump +${weightInc} ${unit}`;
  }

  return {
    isGraduated,
    minReps,
    maxReps,
    currentWeight,
    suggestedWeight,
    weightInc,
    lastReps,
    message,
  };
}

// Determine next routine in the 3-day split: Workout A -> Workout B -> Workout C -> Workout A
// If freestyle or custom, returns null so a dedicated freestyle recovery prescription is generated
export function determineNextRoutine(
  latestWorkout?: CompletedWorkout | null,
  routines: TrainingRoutine[] = TRAINING_ROUTINES
): TrainingRoutine | null {
  if (!latestWorkout) {
    return routines[0] || TRAINING_ROUTINES[0];
  }

  const titleLower = (latestWorkout?.title || '').toLowerCase();

  if (titleLower.includes('workout a') || titleLower.includes('squat & horizontal')) {
    return (
      routines.find((r) => r.id === 'workout-b') ||
      routines[1] ||
      TRAINING_ROUTINES[1]
    );
  }

  if (titleLower.includes('workout b') || titleLower.includes('hinge & vertical')) {
    return (
      routines.find((r) => r.id === 'workout-c') ||
      routines[2] ||
      TRAINING_ROUTINES[2]
    );
  }

  if (titleLower.includes('workout c') || titleLower.includes('hypertrophy & unilateral')) {
    return (
      routines.find((r) => r.id === 'workout-a') ||
      routines[0] ||
      TRAINING_ROUTINES[0]
    );
  }

  // Freestyle or custom session: do not force Workout A/B/C rotation
  return null;
}

// Compute Double Progression Prescription for a dedicated Freestyle session
export function generateFreestylePrescription(
  workout: CompletedWorkout,
  workoutsHistory: CompletedWorkout[],
  unit: WeightUnit = 'lbs'
): PrescribedNextWorkout {
  const workedCategories = new Set<MuscleCategory>(
    (workout?.exercises || []).map((e) => e.category).filter(Boolean)
  );

  const hasPush =
    workedCategories.has('Chest') ||
    workedCategories.has('Triceps') ||
    workedCategories.has('Shoulders');
  const hasPull = workedCategories.has('Back') || workedCategories.has('Biceps');
  const hasLegs = workedCategories.has('Legs');

  let title = 'Freestyle: Balanced Recovery & Antagonist Split';
  let targetMuscleGroups: MuscleCategory[] = [];
  let recoveryAdvice = '';
  let candidateExercises: {
    name: string;
    category: MuscleCategory;
    targetReps: string;
    restDuration: string;
    restSeconds: number;
  }[] = [];

  if (hasPush && !hasPull && !hasLegs) {
    title = 'Freestyle: Back, Biceps & Hamstrings (Pull & Hinge)';
    targetMuscleGroups = ['Back', 'Biceps', 'Legs'];
    recoveryAdvice =
      'Your pushing muscles (chest, triceps, front deltoids) need 48 hours to recover. Direct your next freestyle session toward pulling exercises, posterior chain, and elbow flexors.';
    candidateExercises = [
      { name: 'Lat Pulldown', category: 'Back', targetReps: '8–12 reps', restDuration: '90 sec rest', restSeconds: 90 },
      { name: 'One-Arm Dumbbell Row', category: 'Back', targetReps: '8–12 reps', restDuration: '90 sec rest', restSeconds: 90 },
      { name: 'Romanian Deadlift', category: 'Legs', targetReps: '8–10 reps', restDuration: '90 sec rest', restSeconds: 90 },
      { name: 'Incline Dumbbell Bicep Curl', category: 'Biceps', targetReps: '10–12 reps', restDuration: '60 sec rest', restSeconds: 60 },
      { name: 'Dumbbell Hammer Curl', category: 'Biceps', targetReps: '10–12 reps', restDuration: '60 sec rest', restSeconds: 60 },
    ];
  } else if (hasLegs && !hasPush && !hasPull) {
    title = 'Freestyle: Upper Body Push & Pull Antagonists';
    targetMuscleGroups = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps'];
    recoveryAdvice =
      'Allow 48 hours for lower body motor units and spinal erectors to restore glycogen. Focus your next freestyle session on upper-body horizontal and vertical pressing/pulling.';
    candidateExercises = [
      { name: 'Barbell Bench Press', category: 'Chest', targetReps: '8–10 reps', restDuration: '2 min rest', restSeconds: 120 },
      { name: 'Chest-Supported Row', category: 'Back', targetReps: '8–10 reps', restDuration: '90 sec rest', restSeconds: 90 },
      { name: 'Overhead Press', category: 'Shoulders', targetReps: '8–10 reps', restDuration: '2 min rest', restSeconds: 120 },
      { name: 'Dumbbell Lateral Raise', category: 'Shoulders', targetReps: '12–15 reps', restDuration: '60 sec rest', restSeconds: 60 },
      { name: 'Triceps Cable Pushdown', category: 'Triceps', targetReps: '12–15 reps', restDuration: '60 sec rest', restSeconds: 60 },
    ];
  } else if (hasPull && !hasPush && !hasLegs) {
    title = 'Freestyle: Chest, Shoulders & Quads (Push & Squat)';
    targetMuscleGroups = ['Chest', 'Shoulders', 'Triceps', 'Legs'];
    recoveryAdvice =
      'Back and biceps were loaded today. For your next freestyle session, switch to quad anterior knee flexion and anterior upper body pressing.';
    candidateExercises = [
      { name: 'Barbell Back Squat', category: 'Legs', targetReps: '6–8 reps', restDuration: '2 min rest', restSeconds: 120 },
      { name: 'Barbell Bench Press', category: 'Chest', targetReps: '8–10 reps', restDuration: '2 min rest', restSeconds: 120 },
      { name: 'Incline Dumbbell Bench Press', category: 'Chest', targetReps: '8–12 reps', restDuration: '90 sec rest', restSeconds: 90 },
      { name: 'Dumbbell Lateral Raise', category: 'Shoulders', targetReps: '12–15 reps', restDuration: '60 sec rest', restSeconds: 60 },
      { name: 'Overhead Cable Triceps Extension', category: 'Triceps', targetReps: '12–15 reps', restDuration: '60 sec rest', restSeconds: 60 },
    ];
  } else {
    title = 'Freestyle: Complementary Hypertrophy & Active Recovery';
    targetMuscleGroups = ['Shoulders', 'Biceps', 'Triceps', 'Core'];
    recoveryAdvice =
      'Comprehensive total-body stimulus recorded today. Allow 48 hours for central nervous system restoration. In your next freestyle session, target arms, lateral delts, and core accessories.';
    candidateExercises = [
      { name: 'Dumbbell Lateral Raise', category: 'Shoulders', targetReps: '12–15 reps', restDuration: '60 sec rest', restSeconds: 60 },
      { name: 'Incline Dumbbell Bicep Curl', category: 'Biceps', targetReps: '10–12 reps', restDuration: '60 sec rest', restSeconds: 60 },
      { name: 'Triceps Cable Pushdown', category: 'Triceps', targetReps: '12–15 reps', restDuration: '60 sec rest', restSeconds: 60 },
      { name: 'Hanging Knee Raise', category: 'Core', targetReps: '12–15 reps', restDuration: '60 sec rest', restSeconds: 60 },
    ];
  }

  const exercises: NextWorkoutExercisePrescription[] = candidateExercises.map((target) => {
    const history = getExerciseHistoryRecord(target.name, workoutsHistory);
    const { minReps, maxReps } = parseRepBracket(target.targetReps);
    const isLower = isHeavyLowerCompound(target.name, target.category);
    const weightInc = unit === 'lbs' ? (isLower ? 10 : 5) : (isLower ? 5 : 2.5);

    if (!history) {
      return {
        exerciseName: target.name,
        category: target.category,
        targetSets: 3,
        targetReps: target.targetReps,
        targetWeight: 'Starting weight',
        restDuration: target.restDuration,
        restSeconds: target.restSeconds,
        doubleProgressionNote: `Calibration set. Pick a weight to achieve ${target.targetReps} with 1-2 reps in reserve.`,
      };
    }

    const allHitMax = history.allReps.length >= 2 && history.allReps.every((r) => r >= maxReps);
    if (allHitMax) {
      const newWeight = history.maxWeight + weightInc;
      return {
        exerciseName: target.name,
        category: target.category,
        targetSets: 3,
        targetReps: `${minReps}–${maxReps} reps`,
        targetWeight: newWeight,
        restDuration: target.restDuration,
        restSeconds: target.restSeconds,
        doubleProgressionNote: `Graduated! Hit ${maxReps} reps on all sets. Added +${weightInc} ${unit} to ${newWeight} ${unit}. Aim for ${minReps} reps.`,
      };
    } else {
      return {
        exerciseName: target.name,
        category: target.category,
        targetSets: 3,
        targetReps: `${minReps}–${maxReps} reps`,
        targetWeight: history.maxWeight,
        restDuration: target.restDuration,
        restSeconds: target.restSeconds,
        doubleProgressionNote: `Consolidating reps. Hold load at ${history.maxWeight} ${unit} and build towards ${maxReps} reps.`,
      };
    }
  });

  return {
    recommendedSplit: title,
    splitId: 'freestyle-custom',
    targetMuscleGroups,
    recoveryHours: 48,
    recoveryAdvice,
    exercises,
  };
}

// Compute Double Progression Prescription for a specific routine
export function generatePrescriptionForRoutine(
  routine: TrainingRoutine,
  workoutsHistory: CompletedWorkout[],
  unit: WeightUnit = 'lbs'
): PrescribedNextWorkout {
  const exercises: NextWorkoutExercisePrescription[] = routine.exercises.map((target) => {
    const history = getExerciseHistoryRecord(target.name, workoutsHistory);
    const { minReps, maxReps } = parseRepBracket(target.targetReps);
    const isLower = isHeavyLowerCompound(target.name, target.category);
    const weightInc = unit === 'lbs' ? (isLower ? 10 : 5) : (isLower ? 5 : 2.5);

    if (!history) {
      return {
        exerciseName: target.name,
        category: target.category,
        targetSets: target.targetSets || 3,
        targetReps: target.targetReps,
        targetWeight: 'Starting weight',
        restDuration: target.restDuration || '90 sec rest',
        restSeconds: target.restSeconds || 90,
        doubleProgressionNote: `Initial calibration session. Choose a moderate weight to hit ${target.targetReps} with 1-2 reps in reserve.`,
      };
    }

    // Double progression rule:
    // Did they hit top of rep bracket on ALL completed sets?
    const allHitMax =
      history.allReps.length >= 2 && history.allReps.every((r) => r >= maxReps);

    if (allHitMax) {
      const newWeight = history.maxWeight + weightInc;
      return {
        exerciseName: target.name,
        category: target.category,
        targetSets: target.targetSets || 3,
        targetReps: `${minReps}–${maxReps} reps`,
        targetWeight: newWeight,
        restDuration: target.restDuration || '90 sec rest',
        restSeconds: target.restSeconds || 90,
        doubleProgressionNote: `Graduated! You hit ${maxReps} reps across all sets. Stepped up +${weightInc} ${unit} to ${newWeight} ${unit}. Aim for ${minReps} reps.`,
      };
    } else {
      return {
        exerciseName: target.name,
        category: target.category,
        targetSets: target.targetSets || 3,
        targetReps: `${minReps}–${maxReps} reps`,
        targetWeight: history.maxWeight,
        restDuration: target.restDuration || '90 sec rest',
        restSeconds: target.restSeconds || 90,
        doubleProgressionNote: `Consolidating reps. Hold load at ${history.maxWeight} ${unit} and build towards ${maxReps} reps on all sets.`,
      };
    }
  });

  const muscleGroups = Array.from(new Set(routine.exercises.map((e) => e.category)));

  return {
    recommendedSplit: routine.title,
    splitId: routine.id,
    targetMuscleGroups: muscleGroups,
    recoveryHours: 48,
    recoveryAdvice: `Allow 48 hours for protein synthesis and central nervous system recovery before your next session. Focus on 0.8–1.0g protein/lb, hydration, and sleep.`,
    exercises,
  };
}

// Generate the complete Double Progression Analysis for the post-workout critique
export function analyzeSessionDoubleProgression(
  workout: CompletedWorkout,
  workoutsHistory: CompletedWorkout[]
): {
  whatYouDidRight: string[];
  areasToImprove: string[];
  progressiveOverloadAdvice: ProgressiveOverloadItem[];
  prescribedNextWorkout: PrescribedNextWorkout;
} {
  const unit = workout.unit || 'lbs';
  const whatYouDidRight: string[] = [];
  const areasToImprove: string[] = [];
  const progressiveOverloadAdvice: ProgressiveOverloadItem[] = [];

  const completedSets = workout.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.completed).length,
    0
  );
  const totalVolume = workout.totalVolume || 0;
  const durationMin = Math.max(1, Math.round((workout.durationSeconds || 0) / 60));

  whatYouDidRight.push(
    `Completed ${completedSets} working sets across ${workout.exercises.length} exercises with high volume adherence.`
  );
  whatYouDidRight.push(
    `Total volume workload: ${totalVolume.toLocaleString()} ${unit} moved in ${durationMin}m (${Math.round(totalVolume / durationMin)} ${unit}/min training density).`
  );

  // Evaluate each exercise in this workout for double progression
  workout.exercises.forEach((ex) => {
    const validSets = ex.sets.filter(
      (s) => s.completed && typeof s.reps === 'number' && s.reps > 0
    );
    if (validSets.length === 0) return;

    const maxWeight = Math.max(...validSets.map((s) => Number(s.weight) || 0));
    const reps = validSets.map((s) => Number(s.reps));
    const avgReps = reps.reduce((a, b) => a + b, 0) / reps.length;
    const isLower = isHeavyLowerCompound(ex.name, ex.category);
    const weightInc = unit === 'lbs' ? (isLower ? 10 : 5) : (isLower ? 5 : 2.5);

    // Exact target rep bracket for this exercise
    const { minReps, maxReps } = getExerciseTargetRepBracket(ex.name, ex.category);
    const targetMax = maxReps;
    const targetMin = minReps;

    const isGraduated = reps.length >= 2 && reps.every((r) => r >= targetMax);

    if (isGraduated) {
      whatYouDidRight.push(
        `Max rep bracket cleared on ${ex.name}: ${reps.join(', ')} reps! Cleared all ${targetMax} reps across sets.`
      );
      progressiveOverloadAdvice.push({
        exerciseName: ex.name,
        status: 'ready_to_increase',
        advice: `Graduated at ${maxWeight} ${unit}! You hit the ${targetMax}-rep ceiling across all sets (${reps.join(', ')}). Bump load by +${weightInc} ${unit} to ${
          maxWeight + weightInc
        } ${unit} next session and target ${targetMin} reps.`,
      });
    } else if (reps.some((r) => r >= targetMin)) {
      progressiveOverloadAdvice.push({
        exerciseName: ex.name,
        status: 'hold_and_build_reps',
        advice: `Solid working base at ${maxWeight} ${unit} (${reps.join(', ')} reps). Target bracket is ${targetMin}–${targetMax} reps. Hold load at ${maxWeight} ${unit} and build reps until you reach ${targetMax} reps across all sets to graduate.`,
      });
    } else {
      areasToImprove.push(
        `Rep count fell short of the ${targetMin}–${targetMax} rep target on ${ex.name} (${reps.join(', ')} reps). Ensure full rest intervals between working sets.`
      );
      progressiveOverloadAdvice.push({
        exerciseName: ex.name,
        status: 'refine_form',
        advice: `Rest at least 90–120s between sets at ${maxWeight} ${unit}. Control 3-second eccentric tempo and aim for ${targetMin} reps before adding load.`,
      });
    }
  });

  if (areasToImprove.length === 0) {
    areasToImprove.push(
      `Keep rest intervals locked in (2 min on squats/deadlifts/bench, 90s on rows, 60s on arms/shoulders) to maintain rep intensity.`
    );
    areasToImprove.push(
      `Ensure full range of motion at lockout and controlled eccentric negatives on final repetitions.`
    );
  }

  // Determine next prescribed workout:
  // If it was Workout A/B/C, follow the structured 3-day cycle: A -> B -> C -> A
  // If it was a Freestyle / custom workout, generate a dedicated freestyle recovery prescription
  const nextRoutine = determineNextRoutine(workout, TRAINING_ROUTINES);
  const prescribedNextWorkout = nextRoutine
    ? generatePrescriptionForRoutine(nextRoutine, [workout, ...workoutsHistory], unit)
    : generateFreestylePrescription(workout, [workout, ...workoutsHistory], unit);

  return {
    whatYouDidRight,
    areasToImprove,
    progressiveOverloadAdvice,
    prescribedNextWorkout,
  };
}
