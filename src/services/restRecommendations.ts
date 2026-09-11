export type RestTier = 'Heavy Compound' | 'Moderate Compound' | 'Isolation & Accessory';

export interface RestRecommendation {
  seconds: number;
  displayLabel: string;
  rangeLabel: string;
  tier: RestTier;
  rationale: string;
}

// Heavy compound exercises requiring 2–3 minutes (CNS recovery & ATP-CP replenishment)
const HEAVY_COMPOUND_PATTERNS = [
  'squat',
  'deadlift',
  'bench press',
  'barbell bench',
  'overhead press',
  'military press',
  'bent-over row',
  'barbell row',
  'romanian deadlift',
  'rdl',
  'front squat',
  'good morning',
];

// Isolation and accessories requiring 60–90 seconds
const ISOLATION_PATTERNS = [
  'curl',
  'lateral raise',
  'lateral',
  'front raise',
  'rear delt',
  'face pull',
  'pushdown',
  'triceps extension',
  'tricep extension',
  'skull crusher',
  'kickback',
  'calf raise',
  'calf',
  'leg curl',
  'hamstring curl',
  'leg extension',
  'knee raise',
  'crunch',
  'plank',
  'ab rollout',
  'wrist curl',
  'shrug',
  'fly',
  'flye',
  'pec deck',
  'cable crossover',
];

/**
 * Calculates optimal rest recommendation for any given exercise.
 * Heavy compounds: 2–3 minutes (default timer: 150s)
 * Moderate compounds: 90–120 seconds (default timer: 105s)
 * Isolation & accessories: 60–90 seconds (default timer: 75s)
 */
export function getExerciseRestRecommendation(
  exerciseName: string,
  category?: string,
  equipment?: string
): RestRecommendation {
  const name = exerciseName.toLowerCase();
  const cat = (category || '').toLowerCase();
  const eq = (equipment || '').toLowerCase();

  // 1. Check for Heavy Compound
  const isHeavyCompound = HEAVY_COMPOUND_PATTERNS.some((pattern) => name.includes(pattern)) &&
    !name.includes('bicep') &&
    !name.includes('leg curl') &&
    !name.includes('dumbell curl');

  if (isHeavyCompound) {
    return {
      seconds: 150, // 2m 30s
      displayLabel: '2 – 3 min (150s)',
      rangeLabel: '2 – 3 minutes',
      tier: 'Heavy Compound',
      rationale: 'Heavy multi-joint lift: 2–3 min ensures complete ATP-CP resynthesis and maximal motor recruitment.',
    };
  }

  // 2. Check for Isolation / Accessory
  const isIsolation =
    ISOLATION_PATTERNS.some((pattern) => name.includes(pattern)) ||
    cat === 'arms' ||
    cat === 'shoulders' && (name.includes('raise') || name.includes('delt')) ||
    cat === 'core';

  if (isIsolation) {
    return {
      seconds: 75, // 1m 15s
      displayLabel: '60 – 90s (75s)',
      rangeLabel: '60 – 90 seconds',
      tier: 'Isolation & Accessory',
      rationale: 'Single-joint accessory: 60–90s maximizes muscular pump and localized metabolic stress.',
    };
  }

  // 3. Default to Moderate Compound (e.g. Leg press, Lat pulldown, Dumbbell rows, Incline presses, Dips, Pull-ups, Machine presses)
  return {
    seconds: 105, // 1m 45s
    displayLabel: '90 – 120s (105s)',
    rangeLabel: '90 – 120 seconds',
    tier: 'Moderate Compound',
    rationale: 'Moderate compound: 90–120s balances systemic power output with hypertrophy density.',
  };
}
