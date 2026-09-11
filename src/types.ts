export type MuscleCategory =
  | 'Chest'
  | 'Back'
  | 'Shoulders'
  | 'Legs'
  | 'Glutes'
  | 'Calves'
  | 'Biceps'
  | 'Triceps'
  | 'Forearms'
  | 'Core'
  | 'Cardio';

export type WeightUnit = 'lbs' | 'kg';

export interface ExerciseTemplate {
  id: string;
  name: string;
  category: MuscleCategory;
  equipment: 'Barbell' | 'Dumbbell' | 'Cable' | 'Machine' | 'Bodyweight' | 'Other';
  defaultRestSeconds: number;
  isCustom?: boolean;
}

export interface WorkoutSet {
  id: string;
  setNumber: number;
  weight: number | '';
  reps: number | '';
  completed: boolean;
  previous?: string; // e.g. "185 lb × 8"
}

export interface ActiveExercise {
  id: string; // unique instance in current workout
  exerciseId: string; // reference to template id
  name: string;
  category: MuscleCategory;
  equipment?: string;
  sets: WorkoutSet[];
}

export interface ProgressiveOverloadItem {
  exerciseName: string;
  status: 'ready_to_increase' | 'hold_and_build_reps' | 'refine_form';
  advice: string;
}

export interface ExerciseProgressionStatus {
  isGraduated: boolean;
  minReps: number;
  maxReps: number;
  currentWeight: number | null;
  suggestedWeight: number | null;
  weightInc: number;
  lastReps: number[];
  message: string;
}

export interface NextWorkoutExercisePrescription {
  exerciseName: string;
  category: MuscleCategory;
  targetSets: number;
  targetReps: string; // e.g. "8–10 reps"
  targetWeight: number | string; // e.g. 95 or "Choose starting weight"
  restDuration: string; // e.g. "2 min rest"
  restSeconds: number;
  doubleProgressionNote: string; // e.g. "Graduated! +5 lbs increase from 90 lbs (hit 10 reps on all sets last session)"
}

export interface PrescribedNextWorkout {
  recommendedSplit: string;
  splitId?: string; // e.g. 'workout-a', 'workout-b', 'workout-c'
  targetMuscleGroups: string[];
  recoveryHours: number;
  recoveryAdvice: string;
  exercises?: NextWorkoutExercisePrescription[];
}

export interface AICritique {
  headline: string;
  whatYouDidRight?: string[]; // Areas of accomplishment, high reps, volume wins
  areasToImprove?: string[]; // Critiques, areas for improvement, pacing, rest adherence
  highlights: string[]; // For backwards compatibility
  progressiveOverloadAdvice: ProgressiveOverloadItem[];
  prescribedNextWorkout: PrescribedNextWorkout;
  coachNote?: string;
  generatedAt: string;
  source: 'gemini' | 'offline_engine';
}

export interface CompletedWorkout {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  durationSeconds: number;
  durationFormatted: string;
  totalVolume: number;
  unit: WeightUnit;
  completedSetsCount: number;
  exercises: ActiveExercise[];
  critique?: AICritique;
}

export type AppTheme = 'midnight' | 'electric' | 'lime' | 'monochrome';

export interface UserSettings {
  unit: WeightUnit;
  defaultRestSeconds: number;
  restTimerEnabled: boolean;
  soundEnabled: boolean;
  geminiApiKey: string;
  athleteName?: string;
  theme: AppTheme;
  autoCollapseCompleted?: boolean;
}

export type TabType = 'home' | 'workout' | 'plan' | 'history' | 'coach' | 'settings';

export interface RoutineExerciseTarget {
  name: string;
  category: MuscleCategory;
  equipment: string;
  targetSets: number;
  targetReps: string; // e.g. "8–12" or "45–60s"
  guidance: string; // e.g. "Choose your starting load"
  restDuration?: string; // e.g. "2 min rest"
  restSeconds?: number;
}

export interface TrainingRoutine {
  id: string;
  shortTitle?: string; // e.g. "Workout A"
  title: string; // e.g. "Workout A: Squat & Horizontal Push/Pull"
  focusTag: string; // e.g. "Squat & Horizontal Push/Pull"
  description: string;
  exercises: RoutineExerciseTarget[];
}
