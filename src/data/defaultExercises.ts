import { ExerciseTemplate, MuscleCategory } from '../types';

export const CATEGORIES: MuscleCategory[] = [
  'Chest',
  'Back',
  'Shoulders',
  'Legs',
  'Glutes',
  'Calves',
  'Biceps',
  'Triceps',
  'Forearms',
  'Core',
  'Cardio',
];

export const DEFAULT_EXERCISES: ExerciseTemplate[] = [
  // CHEST
  { id: 'ex-chest-bb-flat', name: 'Barbell Bench Press', category: 'Chest', equipment: 'Barbell', defaultRestSeconds: 120 },
  { id: 'ex-chest-bb-inc', name: 'Incline Barbell Bench Press', category: 'Chest', equipment: 'Barbell', defaultRestSeconds: 120 },
  { id: 'ex-chest-bb-dec', name: 'Decline Barbell Bench Press', category: 'Chest', equipment: 'Barbell', defaultRestSeconds: 120 },
  { id: 'ex-chest-bb-cg', name: 'Close-Grip Barbell Bench Press', category: 'Chest', equipment: 'Barbell', defaultRestSeconds: 90 },
  { id: 'ex-chest-db-flat', name: 'Dumbbell Bench Press', category: 'Chest', equipment: 'Dumbbell', defaultRestSeconds: 90 },
  { id: 'ex-chest-db-inc', name: 'Incline Dumbbell Bench Press', category: 'Chest', equipment: 'Dumbbell', defaultRestSeconds: 90 },
  { id: 'ex-chest-db-dec', name: 'Decline Dumbbell Bench Press', category: 'Chest', equipment: 'Dumbbell', defaultRestSeconds: 90 },
  { id: 'ex-chest-db-fly', name: 'Dumbbell Chest Fly', category: 'Chest', equipment: 'Dumbbell', defaultRestSeconds: 75 },
  { id: 'ex-chest-db-pull', name: 'Dumbbell Pullover', category: 'Chest', equipment: 'Dumbbell', defaultRestSeconds: 75 },
  { id: 'ex-chest-cable-fly', name: 'Cable Chest Fly', category: 'Chest', equipment: 'Cable', defaultRestSeconds: 60 },
  { id: 'ex-chest-cable-inc', name: 'Incline Cable Fly', category: 'Chest', equipment: 'Cable', defaultRestSeconds: 60 },
  { id: 'ex-chest-cable-l2h', name: 'Low-to-High Cable Fly', category: 'Chest', equipment: 'Cable', defaultRestSeconds: 60 },
  { id: 'ex-chest-cable-h2l', name: 'High-to-Low Cable Fly', category: 'Chest', equipment: 'Cable', defaultRestSeconds: 60 },
  { id: 'ex-chest-mach-press', name: 'Machine Chest Press', category: 'Chest', equipment: 'Machine', defaultRestSeconds: 90 },
  { id: 'ex-chest-mach-inc', name: 'Incline Machine Chest Press', category: 'Chest', equipment: 'Machine', defaultRestSeconds: 90 },
  { id: 'ex-chest-mach-pec', name: 'Pec Deck Fly (Machine)', category: 'Chest', equipment: 'Machine', defaultRestSeconds: 75 },
  { id: 'ex-chest-bw-dips', name: 'Dips (Chest Focus)', category: 'Chest', equipment: 'Bodyweight', defaultRestSeconds: 90 },
  { id: 'ex-chest-bw-pushup', name: 'Push-Ups', category: 'Chest', equipment: 'Bodyweight', defaultRestSeconds: 60 },
  { id: 'ex-chest-bw-inc-push', name: 'Incline Push-Ups', category: 'Chest', equipment: 'Bodyweight', defaultRestSeconds: 60 },
  { id: 'ex-chest-bw-dec-push', name: 'Decline Push-Ups', category: 'Chest', equipment: 'Bodyweight', defaultRestSeconds: 60 },

  // BACK
  { id: 'ex-back-1', name: 'Barbell Deadlift', category: 'Back', equipment: 'Barbell', defaultRestSeconds: 180 },
  { id: 'ex-back-1b', name: 'Conventional Deadlift', category: 'Legs', equipment: 'Barbell', defaultRestSeconds: 150 },
  { id: 'ex-back-1c', name: 'Trap Bar Deadlift', category: 'Legs', equipment: 'Barbell', defaultRestSeconds: 150 },
  { id: 'ex-back-2', name: 'Barbell Bent-Over Row', category: 'Back', equipment: 'Barbell', defaultRestSeconds: 120 },
  { id: 'ex-back-2b', name: 'Chest-Supported Row', category: 'Back', equipment: 'Machine', defaultRestSeconds: 90 },
  { id: 'ex-back-3', name: 'Lat Pulldown', category: 'Back', equipment: 'Cable', defaultRestSeconds: 90 },
  { id: 'ex-back-4', name: 'Pull-Ups / Chin-Ups', category: 'Back', equipment: 'Bodyweight', defaultRestSeconds: 90 },
  { id: 'ex-back-4b', name: 'Assisted Pull-Ups', category: 'Back', equipment: 'Machine', defaultRestSeconds: 90 },
  { id: 'ex-back-5', name: 'Seated Cable Row', category: 'Back', equipment: 'Cable', defaultRestSeconds: 90 },
  { id: 'ex-back-6', name: 'Single-Arm Dumbbell Row', category: 'Back', equipment: 'Dumbbell', defaultRestSeconds: 75 },
  { id: 'ex-back-6b', name: 'One-Arm Dumbbell Row', category: 'Back', equipment: 'Dumbbell', defaultRestSeconds: 90 },
  { id: 'ex-back-7', name: 'Face Pull', category: 'Back', equipment: 'Cable', defaultRestSeconds: 60 },

  // SHOULDERS
  { id: 'ex-sh-1', name: 'Overhead Barbell Press', category: 'Shoulders', equipment: 'Barbell', defaultRestSeconds: 120 },
  { id: 'ex-sh-1b', name: 'Overhead Press', category: 'Shoulders', equipment: 'Barbell', defaultRestSeconds: 120 },
  { id: 'ex-sh-2', name: 'Dumbbell Lateral Raise', category: 'Shoulders', equipment: 'Dumbbell', defaultRestSeconds: 60 },
  { id: 'ex-sh-3', name: 'Arnold Press', category: 'Shoulders', equipment: 'Dumbbell', defaultRestSeconds: 90 },
  { id: 'ex-sh-4', name: 'Cable Lateral Raise', category: 'Shoulders', equipment: 'Cable', defaultRestSeconds: 60 },
  { id: 'ex-sh-5', name: 'Rear Delt Reverse Fly', category: 'Shoulders', equipment: 'Dumbbell', defaultRestSeconds: 60 },

  // LEGS
  { id: 'ex-leg-1', name: 'Barbell Back Squat', category: 'Legs', equipment: 'Barbell', defaultRestSeconds: 120 },
  { id: 'ex-leg-1b', name: 'Goblet Squat', category: 'Legs', equipment: 'Dumbbell', defaultRestSeconds: 90 },
  { id: 'ex-leg-1c', name: 'Front Squat', category: 'Legs', equipment: 'Barbell', defaultRestSeconds: 120 },
  { id: 'ex-leg-1d', name: 'Hack Squat', category: 'Legs', equipment: 'Machine', defaultRestSeconds: 120 },
  { id: 'ex-leg-2', name: 'Leg Press', category: 'Legs', equipment: 'Machine', defaultRestSeconds: 90 },
  { id: 'ex-leg-2b', name: 'Bulgarian Split Squat', category: 'Legs', equipment: 'Dumbbell', defaultRestSeconds: 90 },
  { id: 'ex-leg-3', name: 'Romanian Deadlift (RDL)', category: 'Legs', equipment: 'Barbell', defaultRestSeconds: 90 },
  { id: 'ex-leg-3b', name: 'Romanian Deadlift', category: 'Legs', equipment: 'Barbell', defaultRestSeconds: 90 },
  { id: 'ex-leg-4', name: 'Leg Extension', category: 'Legs', equipment: 'Machine', defaultRestSeconds: 75 },
  { id: 'ex-leg-5', name: 'Lying Hamstring Curl', category: 'Legs', equipment: 'Machine', defaultRestSeconds: 75 },
  { id: 'ex-leg-5b', name: 'Lying Hamstring Leg Curl', category: 'Legs', equipment: 'Machine', defaultRestSeconds: 75 },
  { id: 'ex-leg-5c', name: 'Seated Hamstring Leg Curl', category: 'Legs', equipment: 'Machine', defaultRestSeconds: 75 },
  { id: 'ex-leg-6', name: 'Walking Dumbbell Lunges', category: 'Legs', equipment: 'Dumbbell', defaultRestSeconds: 90 },

  // GLUTES
  { id: 'ex-glu-1', name: 'Barbell Hip Thrust', category: 'Glutes', equipment: 'Barbell', defaultRestSeconds: 120 },
  { id: 'ex-glu-2', name: 'Bulgarian Split Squat', category: 'Glutes', equipment: 'Dumbbell', defaultRestSeconds: 90 },
  { id: 'ex-glu-3', name: 'Cable Glute Kickback', category: 'Glutes', equipment: 'Cable', defaultRestSeconds: 60 },
  { id: 'ex-glu-4', name: 'Glute Ham Raise', category: 'Glutes', equipment: 'Bodyweight', defaultRestSeconds: 75 },

  // CALVES
  { id: 'ex-calf-1', name: 'Standing Calf Raise', category: 'Calves', equipment: 'Machine', defaultRestSeconds: 60 },
  { id: 'ex-calf-2', name: 'Seated Calf Raise', category: 'Calves', equipment: 'Machine', defaultRestSeconds: 60 },
  { id: 'ex-calf-3', name: 'Leg Press Calf Press', category: 'Calves', equipment: 'Machine', defaultRestSeconds: 60 },

  // BICEPS
  { id: 'ex-bi-1', name: 'Barbell Curl', category: 'Biceps', equipment: 'Barbell', defaultRestSeconds: 75 },
  { id: 'ex-bi-2', name: 'Incline Dumbbell Curl', category: 'Biceps', equipment: 'Dumbbell', defaultRestSeconds: 60 },
  { id: 'ex-bi-2b', name: 'Incline Dumbbell Bicep Curl', category: 'Biceps', equipment: 'Dumbbell', defaultRestSeconds: 60 },
  { id: 'ex-bi-3', name: 'Hammer Curl', category: 'Biceps', equipment: 'Dumbbell', defaultRestSeconds: 60 },
  { id: 'ex-bi-3c', name: 'Dumbbell Hammer Curl', category: 'Biceps', equipment: 'Dumbbell', defaultRestSeconds: 60 },
  { id: 'ex-bi-4', name: 'Preacher Curl', category: 'Biceps', equipment: 'Machine', defaultRestSeconds: 75 },

  // TRICEPS
  { id: 'ex-tri-1', name: 'Tricep Rope Pushdown', category: 'Triceps', equipment: 'Cable', defaultRestSeconds: 60 },
  { id: 'ex-tri-1b', name: 'Triceps Cable Pushdown', category: 'Triceps', equipment: 'Cable', defaultRestSeconds: 60 },
  { id: 'ex-tri-2', name: 'Skull Crushers (EZ Bar)', category: 'Triceps', equipment: 'Barbell', defaultRestSeconds: 75 },
  { id: 'ex-tri-3', name: 'Close-Grip Bench Press', category: 'Triceps', equipment: 'Barbell', defaultRestSeconds: 90 },
  { id: 'ex-tri-4', name: 'Overhead Cable Extension', category: 'Triceps', equipment: 'Cable', defaultRestSeconds: 60 },
  { id: 'ex-tri-4b', name: 'Overhead Cable Triceps Extension', category: 'Triceps', equipment: 'Cable', defaultRestSeconds: 60 },
  { id: 'ex-tri-4c', name: 'Overhead Triceps Extension', category: 'Triceps', equipment: 'Cable', defaultRestSeconds: 60 },

  // FOREARMS
  { id: 'ex-fa-1', name: 'Farmer Walk', category: 'Forearms', equipment: 'Dumbbell', defaultRestSeconds: 90 },
  { id: 'ex-fa-2', name: 'Barbell Wrist Curl', category: 'Forearms', equipment: 'Barbell', defaultRestSeconds: 60 },
  { id: 'ex-fa-3', name: 'Reverse Barbell Curl', category: 'Forearms', equipment: 'Barbell', defaultRestSeconds: 60 },

  // CORE
  { id: 'ex-core-1', name: 'Hanging Leg Raise', category: 'Core', equipment: 'Bodyweight', defaultRestSeconds: 60 },
  { id: 'ex-core-1b', name: 'Hanging Knee Raise', category: 'Core', equipment: 'Bodyweight', defaultRestSeconds: 60 },
  { id: 'ex-core-2', name: 'Cable Woodchopper', category: 'Core', equipment: 'Cable', defaultRestSeconds: 60 },
  { id: 'ex-core-2b', name: 'Cable Crunch', category: 'Core', equipment: 'Cable', defaultRestSeconds: 60 },
  { id: 'ex-core-3', name: 'Ab Wheel Rollout', category: 'Core', equipment: 'Bodyweight', defaultRestSeconds: 60 },
  { id: 'ex-core-4', name: 'Weighted Plank', category: 'Core', equipment: 'Bodyweight', defaultRestSeconds: 60 },

  // CARDIO
  { id: 'ex-cardio-1', name: 'Incline Treadmill Walk', category: 'Cardio', equipment: 'Machine', defaultRestSeconds: 60 },
  { id: 'ex-cardio-2', name: 'Rowing Machine Intervals', category: 'Cardio', equipment: 'Machine', defaultRestSeconds: 90 },
  { id: 'ex-cardio-3', name: 'Stairmaster', category: 'Cardio', equipment: 'Machine', defaultRestSeconds: 60 },
  { id: 'ex-cardio-4', name: 'Assault Bike Sprint', category: 'Cardio', equipment: 'Machine', defaultRestSeconds: 90 },
];
