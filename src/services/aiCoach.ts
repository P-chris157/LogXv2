import { AICritique, CompletedWorkout } from '../types';
import { analyzeSessionDoubleProgression } from './doubleProgression';

export async function generateWorkoutCritique(
  workout: CompletedWorkout,
  userKey?: string,
  workoutsHistory: CompletedWorkout[] = []
): Promise<AICritique> {
  const localAnalysis = analyzeSessionDoubleProgression(workout, workoutsHistory);

  // 1. Try server-side Gemini API endpoint
  try {
    const response = await fetch('/api/workout-critique', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workout,
        userKey: userKey || '',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.critique) {
        const c = data.critique;
        return {
          headline: c.headline || `Strong session executed! ${workout.totalVolume?.toLocaleString()} ${workout.unit} moved.`,
          whatYouDidRight:
            c.whatYouDidRight && c.whatYouDidRight.length > 0
              ? c.whatYouDidRight
              : c.highlights || localAnalysis.whatYouDidRight,
          areasToImprove:
            c.areasToImprove && c.areasToImprove.length > 0
              ? c.areasToImprove
              : localAnalysis.areasToImprove,
          highlights: c.highlights || localAnalysis.whatYouDidRight,
          progressiveOverloadAdvice:
            c.progressiveOverloadAdvice && c.progressiveOverloadAdvice.length > 0
              ? c.progressiveOverloadAdvice
              : localAnalysis.progressiveOverloadAdvice,
          prescribedNextWorkout: {
            ...localAnalysis.prescribedNextWorkout,
            ...(c.prescribedNextWorkout || {}),
            exercises:
              c.prescribedNextWorkout?.exercises && c.prescribedNextWorkout.exercises.length > 0
                ? c.prescribedNextWorkout.exercises
                : localAnalysis.prescribedNextWorkout.exercises,
          },
          coachNote:
            c.coachNote ||
            'Stick to double progression: hit top of your rep bracket on all sets, then increase weight!',
          generatedAt: new Date().toISOString(),
          source: data.source === 'offline_engine' ? 'offline_engine' : 'gemini',
        };
      }
    }
  } catch {
    // Network failure or offline -> graceful fallback to built-in algorithmic engine
  }

  // 2. Built-in analytical fallback engine
  return generateOfflineCritique(workout, workoutsHistory);
}

export function generateOfflineCritique(
  workout: CompletedWorkout,
  workoutsHistory: CompletedWorkout[] = []
): AICritique {
  const { totalVolume, unit } = workout;
  const analysis = analyzeSessionDoubleProgression(workout, workoutsHistory);

  return {
    headline: `Strong session executed! ${totalVolume?.toLocaleString()} ${unit} moved with clean volume density.`,
    whatYouDidRight: analysis.whatYouDidRight,
    areasToImprove: analysis.areasToImprove,
    highlights: analysis.whatYouDidRight,
    progressiveOverloadAdvice: analysis.progressiveOverloadAdvice,
    prescribedNextWorkout: analysis.prescribedNextWorkout,
    coachNote:
      'Stick to double progression: hit top of your rep bracket on all sets, then increase weight!',
    generatedAt: new Date().toISOString(),
    source: 'offline_engine',
  };
}

// Interactive chat function
export async function sendCoachChatMessage(
  messages: Array<{ role: 'user' | 'model'; content: string }>,
  userKey?: string,
  workoutContext?: any
): Promise<{ text: string; source: 'gemini' | 'offline_engine' }> {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        userKey: userKey || '',
        workoutContext,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.reply) {
        return {
          text: data.reply,
          source: data.fallback ? 'offline_engine' : 'gemini',
        };
      }
    }
  } catch {
    // offline fallback
  }

  // Fallback offline responses for common fitness questions
  const lastUserMsg = messages[messages.length - 1]?.content?.toLowerCase() || '';
  let fallbackReply =
    "Consistency and progressive overload are your greatest levers. Track your weights, aim for +1 rep or +2.5-5 lbs when you hit the top of your target rep range, and ensure you're sleeping 7-9 hours for tissue repair.";

  if (lastUserMsg.includes('plateau') || lastUserMsg.includes('stuck')) {
    fallbackReply =
      "To break a plateau: 1) Try a micro-deload (reduce volume by 30% for 1 week); 2) Switch your rep cadence to a strict 3-second eccentric pause; 3) Check your protein and caloric intake; 4) Ensure your rest intervals are at least 2-3 minutes on heavy compound lifts.";
  } else if (lastUserMsg.includes('split') || lastUserMsg.includes('program')) {
    fallbackReply =
      "For 3-4 days/week, an Upper/Lower split works best. For 5-6 days/week, a Push/Pull/Legs (PPL) split provides optimal frequency and 48 hours recovery between synergistic muscle groups.";
  } else if (lastUserMsg.includes('protein') || lastUserMsg.includes('diet') || lastUserMsg.includes('nutrition')) {
    fallbackReply =
      "Aim for 0.7-1.0 grams of protein per pound of bodyweight (1.6-2.2g/kg) spread across 3-5 meals. Hydrate with 3-4 liters of water daily, especially around your workout window.";
  } else if (lastUserMsg.includes('warmup') || lastUserMsg.includes('warm up')) {
    fallbackReply =
      "Standard compound warmup protocol: 5 mins light cardio to raise core body temp, followed by exercise-specific ramp sets: empty bar x 10, 50% working weight x 5, 70% x 3, 85% x 1. Never fatigue yourself on warmup sets.";
  }

  return {
    text: fallbackReply,
    source: 'offline_engine',
  };
}
