import { CompletedWorkout, ExerciseTemplate, TrainingRoutine, UserSettings } from '../types';
import { TRAINING_ROUTINES } from '../data/trainingPlans';

const STORAGE_KEYS = {
  WORKOUTS: 'logx_workouts_history',
  ACTIVE_WORKOUT: 'logx_active_workout_state',
  CUSTOM_EXERCISES: 'logx_custom_exercises',
  SETTINGS: 'logx_user_settings',
  TRAINING_PLANS: 'logx_training_plans',
};

export const DEFAULT_SETTINGS: UserSettings = {
  unit: 'lbs',
  defaultRestSeconds: 120,
  restTimerEnabled: true,
  soundEnabled: true,
  geminiApiKey: '',
  theme: 'midnight',
  autoCollapseCompleted: true,
};

export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Error reading settings from localStorage', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.warn('Error saving settings to localStorage', e);
  }
}

export function loadWorkouts(): CompletedWorkout[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WORKOUTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading workouts from localStorage', e);
  }
  return [];
}

export function saveWorkouts(workouts: CompletedWorkout[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(workouts));
  } catch (e) {
    console.warn('Error saving workouts to localStorage', e);
  }
}

export function loadCustomExercises(): ExerciseTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_EXERCISES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error loading custom exercises', e);
  }
  return [];
}

export function saveCustomExercises(exercises: ExerciseTemplate[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_EXERCISES, JSON.stringify(exercises));
  } catch (e) {
    console.warn('Error saving custom exercises', e);
  }
}

export function loadTrainingPlans(): TrainingRoutine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRAINING_PLANS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const hasNewWorkoutA = parsed.some(
          (r: any) => r.id === 'workout-a' || (r.title && r.title.includes('Workout A'))
        );
        if (hasNewWorkoutA) {
          let modified = false;
          const cleaned = parsed.map((routine: TrainingRoutine) => {
            let updatedTitle = routine.title
              .replace(/\s*\((Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\)/gi, '')
              .replace(/\s*:\s*/, ': ');
            let updatedFocus = (routine.focusTag || '')
              .replace(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s*·\s*/gi, '')
              .trim();
            let shortTitle = routine.shortTitle;
            if (!shortTitle) {
              if (routine.id === 'workout-a' || updatedTitle.startsWith('Workout A')) shortTitle = 'Workout A';
              else if (routine.id === 'workout-b' || updatedTitle.startsWith('Workout B')) shortTitle = 'Workout B';
              else if (routine.id === 'workout-c' || updatedTitle.startsWith('Workout C')) shortTitle = 'Workout C';
            }

            // Check if exercises contains combined superset
            let exercises = [...routine.exercises];
            const supersetIdx = exercises.findIndex((e) =>
              e.name.toLowerCase().includes('hammer curls & overhead triceps superset')
            );
            if (supersetIdx !== -1) {
              modified = true;
              exercises.splice(
                supersetIdx,
                1,
                {
                  name: 'Dumbbell Hammer Curl',
                  category: 'Biceps',
                  equipment: 'Dumbbell',
                  targetSets: 3,
                  targetReps: '10–12 reps',
                  guidance: 'Dumbbell Hammer Curls · 60 sec rest',
                  restDuration: '60 sec rest',
                  restSeconds: 60,
                },
                {
                  name: 'Overhead Cable Triceps Extension',
                  category: 'Triceps',
                  equipment: 'Cable',
                  targetSets: 3,
                  targetReps: '12–15 reps',
                  guidance: 'Overhead Cable Triceps Extensions · 60 sec rest',
                  restDuration: '60 sec rest',
                  restSeconds: 60,
                }
              );
            }

            // Check if exercises contains flat barbell bench press
            exercises = exercises.map((ex) => {
              if (ex.name === 'Flat Barbell Bench Press') {
                modified = true;
                return {
                  ...ex,
                  name: 'Barbell Bench Press',
                  guidance: 'Barbell Bench Press (or Dumbbell Bench Press) · 2 min rest',
                };
              }
              return ex;
            });

            if (updatedTitle !== routine.title || updatedFocus !== routine.focusTag || shortTitle !== routine.shortTitle) {
              modified = true;
            }

            return {
              ...routine,
              shortTitle: shortTitle || 'Workout',
              title: updatedTitle,
              focusTag: updatedFocus,
              exercises,
            };
          });

          if (modified) {
            saveTrainingPlans(cleaned);
          }
          return cleaned;
        }
      }
    }
  } catch (e) {
    console.warn('Error loading training plans', e);
  }
  return TRAINING_ROUTINES;
}

export function saveTrainingPlans(plans: TrainingRoutine[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TRAINING_PLANS, JSON.stringify(plans));
  } catch (e) {
    console.warn('Error saving training plans', e);
  }
}

export function loadActiveWorkoutState(): any | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_WORKOUT);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}

export function saveActiveWorkoutState(state: any | null): void {
  try {
    if (state === null) {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_WORKOUT);
    } else {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_WORKOUT, JSON.stringify(state));
    }
  } catch {
    // ignore
  }
}

// Find previous session data for an exercise
export function getPreviousExerciseReference(
  exerciseName: string,
  workoutsHistory: CompletedWorkout[]
): { [setIndex: number]: string } {
  const refMap: { [setIndex: number]: string } = {};

  // Sort workouts newest first
  const sorted = [...workoutsHistory].sort((a, b) => b.endTime - a.endTime);

  for (const w of sorted) {
    const matchedEx = w.exercises.find(
      (e) => e.name.toLowerCase().trim() === exerciseName.toLowerCase().trim()
    );
    if (matchedEx && matchedEx.sets.length > 0) {
      matchedEx.sets.forEach((set, idx) => {
        if (set.completed && set.weight !== '' && set.reps !== '') {
          refMap[idx] = `${set.weight} ${w.unit} × ${set.reps}`;
        }
      });
      break; // stop at most recent workout with this exercise
    }
  }

  return refMap;
}

// Retrieve past session's actual logged weight and reps to auto-populate the new set
export function getPreviousExerciseValues(
  exerciseName: string,
  workoutsHistory: CompletedWorkout[]
): { weight: number | ''; reps: number | ''; summaryText: string } | null {
  if (!workoutsHistory || workoutsHistory.length === 0) return null;
  const sorted = [...workoutsHistory].sort((a, b) => b.endTime - a.endTime);

  for (const w of sorted) {
    const matchedEx = w.exercises.find(
      (e) => e.name.toLowerCase().trim() === exerciseName.toLowerCase().trim()
    );
    if (matchedEx && matchedEx.sets && matchedEx.sets.length > 0) {
      const validSets = matchedEx.sets.filter(
        (s) => s.completed && typeof s.weight === 'number' && typeof s.reps === 'number' && s.reps > 0
      );
      if (validSets.length > 0) {
        // Use Set 1 or the most representative set
        const firstSet = validSets[0];
        return {
          weight: firstSet.weight,
          reps: firstSet.reps,
          summaryText: `${firstSet.weight} ${w.unit} × ${firstSet.reps}`,
        };
      }
    }
  }
  return null;
}

// Format clean text summary strictly for external AI copy (title, date, exercise breakdown)
export function formatWorkoutForAI(workout: CompletedWorkout): string {
  const dateStr = new Date(workout.endTime).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  let text = `Workout: ${workout.title}\n`;
  text += `Date: ${dateStr}\n\n`;
  text += `Exercises:\n`;

  workout.exercises.forEach((ex) => {
    const validSets = ex.sets.filter((s) => s.completed && s.weight !== '' && s.reps !== '');
    if (validSets.length > 0) {
      text += `- ${ex.name}:\n`;
      validSets.forEach((s, idx) => {
        text += `  Set ${idx + 1}: ${s.weight} ${workout.unit} × ${s.reps} reps\n`;
      });
    }
  });

  return text.trim();
}

// Format clean text summary for clipboard sharing
export function formatWorkoutForSharing(workout: CompletedWorkout): string {
  const dateStr = new Date(workout.endTime).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  let text = `⚡ LOGX WORKOUT LOG ⚡\n`;
  text += `📅 ${dateStr} • ⏱️ ${workout.durationFormatted}\n`;
  text += `🏋️ Volume: ${workout.totalVolume.toLocaleString()} ${workout.unit} | ${workout.completedSetsCount} sets\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;

  workout.exercises.forEach((ex) => {
    const completedSets = ex.sets.filter((s) => s.completed);
    if (completedSets.length > 0) {
      text += `\n▶ ${ex.name} (${ex.category})\n`;
      completedSets.forEach((s, idx) => {
        text += `  • Set ${idx + 1}: ${s.weight} ${workout.unit} × ${s.reps} reps\n`;
      });
    }
  });

  if (workout.critique) {
    text += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🤖 LOGX AI COACH CRITIQUE:\n`;
    text += `"${workout.critique.headline}"\n`;
    if (workout.critique.highlights?.length) {
      workout.critique.highlights.forEach((h) => {
        text += `• ${h}\n`;
      });
    }
    if (workout.critique.prescribedNextWorkout?.recommendedSplit) {
      text += `\n🎯 Prescribed Next: ${workout.critique.prescribedNextWorkout.recommendedSplit}\n`;
    }
  }

  text += `\nTracked with LogX Gym AI`;
  return text;
}

// Export data backup JSON
export function exportBackupJSON(workouts: CompletedWorkout[], customExercises: ExerciseTemplate[], settings: UserSettings): void {
  const data = {
    app: 'LogX',
    version: '1.0',
    exportDate: new Date().toISOString(),
    settings,
    customExercises,
    workouts,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `logx_backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Generate single-file standalone HTML
export function downloadStandaloneHTML(): void {
  const htmlContent = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>LogX - Gym Workout Tracker & AI Coach</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: { 500: '#10b981', 400: '#34d399', 600: '#059669' }
          }
        }
      }
    }
  </script>
  <style>
    body { background-color: #0b0f17; color: #f1f5f9; font-family: system-ui, -apple-system, sans-serif; }
    input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  </style>
</head>
<body class="bg-[#0b0f17] text-slate-100 min-h-screen pb-20">
  <div class="max-w-md mx-auto p-4">
    <header class="flex items-center justify-between py-3 border-b border-slate-800 mb-4">
      <div class="flex items-center gap-2">
        <span class="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-bold text-emerald-400">X</span>
        <h1 class="text-xl font-bold tracking-tight">Log<span class="text-emerald-400">X</span></h1>
      </div>
      <span class="text-xs px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300">Standalone Edition</span>
    </header>
    <div class="text-center py-8 text-slate-400">
      <p class="text-sm">Welcome to LogX Standalone Edition.</p>
      <p class="text-xs mt-1 text-slate-500">Your full tracker is active at the live web app with interactive AI coaching, rest timer, and full history.</p>
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'LogX_Standalone.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Robust clipboard copying with automatic fallback for iframes and restricted permissions
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('navigator.clipboard.writeText failed, using fallback', err);
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    textArea.style.left = '-9999px';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.warn('Fallback copy to clipboard failed', err);
    return false;
  }
}
