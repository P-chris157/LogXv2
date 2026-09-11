import React, { useState } from 'react';
import {
  Clock,
  Plus,
  Trash2,
  Check,
  RotateCcw,
  Sparkles,
  RefreshCw,
  Search,
  X,
  Dumbbell,
  Play,
  Pause,
  Copy,
  TrendingUp,
  Target,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ActiveExercise,
  CompletedWorkout,
  ExerciseTemplate,
  MuscleCategory,
  WeightUnit,
  WorkoutSet,
} from '../types';
import { soundService } from '../services/sound';
import { getExerciseProgressionStatus } from '../services/doubleProgression';
import { getExerciseRestRecommendation } from '../services/restRecommendations';

interface ActiveWorkoutProps {
  exercises: ActiveExercise[];
  isStarted: boolean;
  durationSeconds: number;
  unit: WeightUnit;
  soundEnabled: boolean;
  previousReferences: { [exerciseName: string]: { [setIndex: number]: string } };
  libraryExercises: ExerciseTemplate[];
  workoutsHistory?: CompletedWorkout[];
  onStartWorkout: () => void;
  onFinishWorkout: () => void;
  onDiscardWorkout: () => void;
  onAddExerciseToWorkout: (template: ExerciseTemplate) => void;
  onRemoveExercise: (exerciseInstanceId: string) => void;
  onAddSet: (exerciseInstanceId: string) => void;
  onRepeatLastSet?: (exerciseInstanceId: string) => void;
  onRemoveSet: (exerciseInstanceId: string, setId: string) => void;
  onUpdateSet: (
    exerciseInstanceId: string,
    setId: string,
    field: 'weight' | 'reps' | 'completed',
    value: any
  ) => void;
  onToggleUnit: () => void;
  workoutTitle: string;
  onChangeTitle: (title: string) => void;
  onReorderExercise?: (currentIndex: number, direction: 'up' | 'down') => void;
  onReplaceExercise?: (exerciseInstanceId: string, newTemplate: ExerciseTemplate) => void;
  onAddNewCustomExercise?: (exercise: Omit<ExerciseTemplate, 'id'>) => void;
  // Global rest timer props managed by App
  restTimerEnabled: boolean;
  restSecondsRemaining: number;
  isRestRunning: boolean;
  onToggleRestTimer: () => void;
  onAdjustRestTimer: (deltaSeconds: number) => void;
  onResetRestTimer?: () => void;
  onTriggerRestTimer: (customDuration?: number) => void;
  configuredRestDuration?: number;
  autoCollapseCompleted?: boolean;
}

const getExerciseEquipment = (exercise: ActiveExercise, library: ExerciseTemplate[] = []): string => {
  const nameLower = exercise.name.toLowerCase();
  // If the exercise name explicitly specifies equipment, stick to that exact one!
  if (nameLower.includes('barbell')) return 'Barbell';
  if (nameLower.includes('dumbbell')) return 'Dumbbell';
  if (nameLower.includes('cable')) return 'Cable';
  if (
    nameLower.includes('machine') ||
    nameLower.includes('leg press') ||
    nameLower.includes('hack squat') ||
    nameLower.includes('leg extension') ||
    nameLower.includes('leg curl')
  ) {
    return 'Machine';
  }
  if (
    nameLower.includes('bodyweight') ||
    nameLower.includes('pull-up') ||
    nameLower.includes('chin-up') ||
    nameLower.includes('push-up') ||
    nameLower.includes('dip') ||
    nameLower.includes('knee raise') ||
    nameLower.includes('crunch') ||
    nameLower.includes('plank')
  ) {
    return 'Bodyweight';
  }

  // If exercise has clean equipment stored
  if (exercise.equipment && !exercise.equipment.includes('/')) {
    return exercise.equipment.replace(/s$/, '');
  }

  // Check matched library template
  const matched = library.find(
    (t) =>
      t.id === exercise.exerciseId ||
      t.name.toLowerCase() === exercise.name.toLowerCase() ||
      t.name.toLowerCase().includes(exercise.name.toLowerCase()) ||
      exercise.name.toLowerCase().includes(t.name.toLowerCase())
  );
  if (matched?.equipment && !matched.equipment.includes('/')) {
    return matched.equipment.replace(/s$/, '');
  }

  return 'Barbell';
};

export const ActiveWorkout: React.FC<ActiveWorkoutProps> = ({
  exercises,
  isStarted,
  durationSeconds,
  unit,
  soundEnabled,
  previousReferences,
  libraryExercises,
  workoutsHistory = [],
  onStartWorkout,
  onFinishWorkout,
  onDiscardWorkout,
  onAddExerciseToWorkout,
  onRemoveExercise,
  onAddSet,
  onRepeatLastSet,
  onRemoveSet,
  onUpdateSet,
  onToggleUnit,
  workoutTitle,
  onChangeTitle,
  onReorderExercise,
  onReplaceExercise,
  onAddNewCustomExercise,
  restTimerEnabled,
  restSecondsRemaining,
  isRestRunning,
  onToggleRestTimer,
  onAdjustRestTimer,
  onResetRestTimer,
  onTriggerRestTimer,
  configuredRestDuration,
  autoCollapseCompleted = true,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MuscleCategory | 'All'>('All');
  const [replacingExerciseId, setReplacingExerciseId] = useState<string | null>(null);
  const [showCreateCustom, setShowCreateCustom] = useState(false);
  const [collapsedExercises, setCollapsedExercises] = useState<Record<string, boolean>>({});

  const toggleCollapseExercise = (exerciseId: string) => {
    setCollapsedExercises((prev) => ({
      ...prev,
      [exerciseId]: !prev[exerciseId],
    }));
  };

  const handleCollapseAll = () => {
    const all: Record<string, boolean> = {};
    exercises.forEach((ex) => {
      all[ex.id] = true;
    });
    setCollapsedExercises(all);
  };

  const handleExpandAll = () => {
    setCollapsedExercises({});
  };

  // Custom exercise form state
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState<MuscleCategory>('Chest');
  const [customEquipment, setCustomEquipment] = useState<
    'Barbell' | 'Dumbbell' | 'Cable' | 'Machine' | 'Bodyweight' | 'Other'
  >('Dumbbell');

  // Total completed sets vs total sets
  const totalSets = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const completedSets = exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.completed).length,
    0
  );

  // A workout is only ready to finish if every exercise card has at least 1 set, and ALL sets across all exercises are completed
  const isAllFullyLogged =
    exercises.length > 0 &&
    exercises.every((ex) => ex.sets.length > 0 && ex.sets.every((s) => s.completed));

  const progressPercent = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;
  const [unloggedWarning, setUnloggedWarning] = useState<string | null>(null);

  const handleAttemptFinish = () => {
    if (exercises.length === 0) {
      setUnloggedWarning('Please add at least one exercise to your workout before finishing.');
      return;
    }

    // 1. Check if any exercise card has zero logged sets
    const emptyExercise = exercises.find((ex) => !ex.sets.some((s) => s.completed));
    if (emptyExercise) {
      setUnloggedWarning(
        `"${emptyExercise.name}" has no logged sets yet. Every exercise card must have at least one logged set before finishing. Please log your sets or remove this exercise.`
      );
      // Automatically expand that exercise card so the user can easily see and log it
      setCollapsedExercises((prev) => ({ ...prev, [emptyExercise.id]: false }));
      return;
    }

    // 2. Check if any exercise has uncompleted sets (e.g. Set 2 is sitting unlogged)
    const exerciseWithUnloggedSets = exercises.find((ex) => ex.sets.some((s) => !s.completed));
    if (exerciseWithUnloggedSets) {
      const uncompletedSetIdx = exerciseWithUnloggedSets.sets.findIndex((s) => !s.completed);
      const setNum = uncompletedSetIdx >= 0 ? uncompletedSetIdx + 1 : 1;
      setUnloggedWarning(
        `"${exerciseWithUnloggedSets.name}" has unlogged sets (Set ${setNum} is not logged). All sets must be fully logged before finishing your workout. Please log the set or remove it if not performed.`
      );
      // Automatically expand that exercise card so the user can easily see and log or delete the set
      setCollapsedExercises((prev) => ({ ...prev, [exerciseWithUnloggedSets.id]: false }));
      return;
    }

    setUnloggedWarning(null);
    onFinishWorkout();
  };

  const formatTimer = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins
        .toString()
        .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Set weight and reps update handler
  const handleWeightOrRepsChange = (
    exInstanceId: string,
    set: WorkoutSet,
    field: 'weight' | 'reps',
    rawVal: string
  ) => {
    const num = Number(rawVal);
    const val = rawVal === '' || Number.isNaN(num) ? '' : num;
    onUpdateSet(exInstanceId, set.id, field, val);
  };

  // Toggle log status (+ button to log, checkmark when completed)
  const handleToggleLogSet = (exInstanceId: string, set: WorkoutSet) => {
    // Prevent logging if weight or reps are blank
    if (!set.completed) {
      const isWeightBlank = set.weight === '';
      const isRepsBlank = set.reps === '' || Number(set.reps) <= 0;

      if (isWeightBlank || isRepsBlank) {
        setUnloggedWarning(
          isWeightBlank && isRepsBlank
            ? 'Weight and reps cannot be blank. Enter your weight and reps before logging this set.'
            : isWeightBlank
            ? 'Weight cannot be blank. Enter a weight before logging this set.'
            : 'Reps cannot be blank. Enter your reps (> 0) before logging this set.'
        );
        return;
      }
    }

    const newStatus = !set.completed;
    onUpdateSet(exInstanceId, set.id, 'completed', newStatus);

    if (newStatus) {
      if (unloggedWarning) {
        setUnloggedWarning(null);
      }
      if (soundEnabled) {
        soundService.playSetCheck();
      }
      if (restTimerEnabled) {
        // Find current exercise's designated rest duration
        const currentEx = exercises.find((e) => e.id === exInstanceId);
        let exRestSecs: number | undefined = undefined;
        if (currentEx) {
          const rec = getExerciseRestRecommendation(
            currentEx.name,
            currentEx.category,
            getExerciseEquipment(currentEx, libraryExercises)
          );
          exRestSecs = rec.seconds;
        }
        onTriggerRestTimer(exRestSecs);
      }

      // Auto-collapse setting: specifically and only when at least 3 sets are logged on this exercise
      if (autoCollapseCompleted) {
        const currentEx = exercises.find((e) => e.id === exInstanceId);
        if (currentEx) {
          const completedCount = currentEx.sets.filter((s) =>
            s.id === set.id ? true : s.completed
          ).length;

          // Only close automatically once 3 or more sets have been logged
          if (completedCount >= 3) {
            setTimeout(() => {
              setCollapsedExercises((prev) => ({
                ...prev,
                [exInstanceId]: true,
              }));

              // Automatically expand the next uncompleted exercise so user can seamlessly continue
              const currIdx = exercises.findIndex((e) => e.id === exInstanceId);
              if (currIdx >= 0 && currIdx < exercises.length - 1) {
                const nextEx = exercises[currIdx + 1];
                if (nextEx) {
                  setCollapsedExercises((prev) => ({
                    ...prev,
                    [nextEx.id]: false,
                  }));
                }
              }
            }, 350);
          }
        }
      }
    }
  };

  const categories: (MuscleCategory | 'All')[] = [
    'All',
    'Chest',
    'Back',
    'Legs',
    'Shoulders',
    'Biceps',
    'Triceps',
    'Core',
    'Cardio',
  ];

  const filteredLibrary = libraryExercises.filter((ex) => {
    const matchesCat = selectedCategory === 'All' || ex.category === selectedCategory;
    const matchesSearch =
      ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleSelectExerciseFromModal = (template: ExerciseTemplate) => {
    if (replacingExerciseId && onReplaceExercise) {
      onReplaceExercise(replacingExerciseId, template);
      setReplacingExerciseId(null);
    } else {
      onAddExerciseToWorkout(template);
    }
    setShowAddModal(false);
    setSearchQuery('');
  };

  const handleCreateAndAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !onAddNewCustomExercise) return;

    const newEx: Omit<ExerciseTemplate, 'id'> = {
      name: customName.trim(),
      category: customCategory,
      equipment: customEquipment,
      defaultRestSeconds: 120,
      isCustom: true,
    };

    onAddNewCustomExercise(newEx);
    const createdTemplate: ExerciseTemplate = {
      ...newEx,
      id: `custom-${Date.now()}`,
    };

    if (replacingExerciseId && onReplaceExercise) {
      onReplaceExercise(replacingExerciseId, createdTemplate);
      setReplacingExerciseId(null);
    } else {
      onAddExerciseToWorkout(createdTemplate);
    }

    setCustomName('');
    setShowCreateCustom(false);
    setShowAddModal(false);
  };

  if (!isStarted) {
    return (
      <div className="py-12 px-4 max-w-md mx-auto text-center space-y-6 animate-fadeIn">
        <div className="rounded-3xl bg-[#141520] border border-[#242638] p-8 shadow-2xl space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-theme-accent-bg border border-theme-border text-theme-light flex items-center justify-center mx-auto shadow-lg">
            <Dumbbell className="w-8 h-8" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-theme-accent block mb-1">
              SESSION NOT STARTED
            </span>
            <h3 className="text-2xl font-black text-white tracking-tight">
              Ready to Work Out?
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
              Start a workout to log your sets, weights, reps, and track your rest timer set-by-set with progressive overload insights.
            </p>
          </div>
          <button
            id="start-workout-tab-btn"
            onClick={onStartWorkout}
            className="w-full py-4 px-6 rounded-2xl btn-theme-primary font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-xl transition-all"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start workout</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-28 animate-fadeIn">
      {/* Top Header Controls (Screenshot 4) */}
      <div className="pt-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-widest text-theme-accent">
            LOG WORKOUT
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleUnit}
              className="px-2.5 py-1 rounded-xl bg-[#191a27] border border-[#26283b] text-[11px] font-bold text-slate-300 hover:text-white"
            >
              {unit.toUpperCase()}
            </button>
            <button
              onClick={onDiscardWorkout}
              className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1 font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>

        <div className="flex items-baseline justify-between mt-1 gap-2">
          <input
            type="text"
            value={workoutTitle}
            onChange={(e) => onChangeTitle(e.target.value)}
            className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight bg-transparent border-b border-transparent hover:border-slate-700 focus:border-theme-accent focus:outline-none flex-1 max-w-[240px]"
            placeholder="Freestyle workout"
          />

          <button
            id="finish-workout-btn"
            onClick={handleAttemptFinish}
            disabled={exercises.length === 0}
            className={`py-2 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md ${
              isAllFullyLogged
                ? 'btn-theme-primary'
                : 'bg-[#212338] hover:bg-[#282a44] text-slate-300 border border-[#373a54]'
            } disabled:opacity-40 disabled:pointer-events-none cursor-pointer`}
            title={
              isAllFullyLogged
                ? 'Finish and save workout'
                : 'All sets across all exercises must be fully logged to finish'
            }
          >
            Finish workout
          </button>
        </div>

        {/* Unlogged Workout Warning Banner (prevents accidental empty finishes) */}
        {unloggedWarning && (
          <div
            id="unlogged-workout-warning"
            className="mt-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-3 animate-fadeIn"
          >
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-bold text-amber-300">Workout Not Logged Yet</div>
              <p className="text-[11px] text-amber-200/90 mt-0.5 leading-relaxed">
                {unloggedWarning}
              </p>
            </div>
            <button
              onClick={() => setUnloggedWarning(null)}
              className="text-amber-400 hover:text-white p-1 rounded-lg transition-colors"
              aria-label="Dismiss warning"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Floating / Docked Rest Timer Widget at top (ONLY rendered when restTimerEnabled is TRUE) */}
      {restTimerEnabled && (
        <div
          id="top-rest-timer-widget"
          className="rounded-2xl bg-[#141520] border border-theme-border p-3.5 flex items-center justify-between shadow-lg"
        >
          <div className="flex items-center gap-3">
            <Clock className={`w-5 h-5 ${isRestRunning ? 'text-theme-light animate-pulse' : 'text-slate-400'}`} />
            <div>
              <span className="text-xs text-slate-400 font-medium block">Rest timer</span>
              <span className="font-mono text-base font-bold text-white">
                {formatTimer(restSecondsRemaining)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="toggle-rest-timer-btn"
              onClick={onToggleRestTimer}
              className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all ${
                isRestRunning
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-theme-accent-bg text-theme-light border border-theme-border'
              }`}
            >
              {isRestRunning
                ? 'Pause'
                : restSecondsRemaining > 0 && restSecondsRemaining < (configuredRestDuration || 120)
                ? 'Resume'
                : 'Start'}
            </button>
            <button
              id="adjust-rest-timer-btn"
              onClick={() => onAdjustRestTimer(30)}
              className="py-1.5 px-3 rounded-xl bg-[#1a1b2a] hover:bg-[#24263a] border border-[#2a2d42] text-xs font-bold text-slate-300"
            >
              +30s
            </button>
            {onResetRestTimer && (
              <button
                id="reset-rest-timer-btn"
                onClick={onResetRestTimer}
                title="Reset timer to original duration"
                aria-label="Reset rest timer"
                className="p-2 rounded-xl bg-[#1a1b2a] hover:bg-[#24263a] border border-[#2a2d42] text-slate-400 hover:text-white transition-colors flex items-center justify-center"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Progress & Live Metrics Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
          <span>
            {completedSets} of {totalSets} sets logged
          </span>
          <div className="flex items-center gap-3">
            {exercises.length > 1 && (
              <button
                type="button"
                id="toggle-collapse-all-exercises-btn"
                onClick={() => {
                  const anyOpen = exercises.some((ex) => !collapsedExercises[ex.id]);
                  if (anyOpen) {
                    handleCollapseAll();
                  } else {
                    handleExpandAll();
                  }
                }}
                className="text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                {exercises.some((ex) => !collapsedExercises[ex.id]) ? 'Collapse all' : 'Expand all'}
              </button>
            )}
            <div className="flex items-center gap-1.5 font-mono text-slate-300">
              <Clock className="w-3.5 h-3.5 text-theme-accent" />
              <span>{formatTimer(durationSeconds)}</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-[#1a1b2a] rounded-full overflow-hidden">
          <div
            className="h-full bg-theme-accent transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Exercises List (Screenshot 3 & 4) */}
      <div className="space-y-4">
        {exercises.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-3xl bg-[#141520] border border-dashed border-[#242638] space-y-3">
            <Dumbbell className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm text-slate-300 font-bold">No exercises added yet</p>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Add exercises from the library to start logging.
            </p>
            <button
              id="first-add-exercise-btn"
              onClick={() => {
                setReplacingExerciseId(null);
                setShowAddModal(true);
              }}
              className="py-2.5 px-5 rounded-2xl btn-theme-primary font-bold text-xs shadow-lg"
            >
              + Add an exercise
            </button>
          </div>
        ) : (
          exercises.map((exercise, exIdx) => {
            const exPrev = previousReferences[exercise.name] || {};
            const progression = getExerciseProgressionStatus(
              exercise.name,
              exercise.category,
              workoutsHistory,
              unit
            );

            const isCollapsed = Boolean(collapsedExercises[exercise.id]);
            const completedCount = exercise.sets.filter((s) => s.completed).length;
            const isCompletedExercise = completedCount >= 3;

            if (isCollapsed) {
              return (
                <div
                  key={exercise.id}
                  id={`active-exercise-card-${exercise.id}`}
                  className="rounded-2xl bg-[#141520] border border-[#242638] hover:border-[#32364e] p-3.5 sm:p-4 shadow-md transition-all cursor-pointer group"
                  onClick={() => toggleCollapseExercise(exercise.id)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                          isCompletedExercise
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-theme-accent-bg border border-theme-border text-theme-light'
                        }`}
                      >
                        {isCompletedExercise ? (
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        ) : (
                          (exIdx + 1).toString().padStart(2, '0')
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm sm:text-base font-bold text-white tracking-tight group-hover:text-theme-light transition-colors truncate">
                            {exercise.name}
                          </h3>

                          {/* Completion Badge */}
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1 ${
                              isCompletedExercise
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {isCompletedExercise ? (
                              <>
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                                <span>Done ({completedCount}/{exercise.sets.length} sets)</span>
                              </>
                            ) : (
                              <span>{completedCount}/{exercise.sets.length} sets</span>
                            )}
                          </span>
                        </div>

                        <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="truncate">
                            {exercise.category} · {getExerciseEquipment(exercise, libraryExercises)}
                          </span>
                          {completedCount > 0 && (
                            <span className="text-slate-500 truncate hidden sm:inline">
                              · {exercise.sets
                                .filter((s) => s.completed)
                                .map((s) => `${s.weight || '0'}×${s.reps || '0'}`)
                                .join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions & Open Chevron */}
                    <div
                      className="flex items-center gap-1 flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => toggleCollapseExercise(exercise.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1f2133] transition-colors flex items-center gap-1 text-xs font-semibold"
                        title="Open exercise"
                      >
                        <span className="hidden sm:inline text-[11px] text-slate-400">Open</span>
                        <ChevronDown className="w-4 h-4 -rotate-90 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={exercise.id}
                id={`active-exercise-card-${exercise.id}`}
                className="rounded-3xl bg-[#141520] border border-[#242638] p-5 shadow-xl space-y-4 transition-all"
              >
                {/* Exercise Header */}
                <div className="flex items-start justify-between">
                  <div
                    className="flex items-start gap-3 cursor-pointer select-none group"
                    onClick={() => toggleCollapseExercise(exercise.id)}
                    title="Click to minimize this exercise card"
                  >
                    <div className="w-7 h-7 rounded-full bg-theme-accent-bg border border-theme-border text-theme-light text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                      {(exIdx + 1).toString().padStart(2, '0')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white tracking-tight group-hover:text-theme-light transition-colors">
                          {exercise.name}
                        </h3>
                        {isCompletedExercise && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                            <span>Done ({completedCount}/{exercise.sets.length})</span>
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400">
                        {exercise.category} · {getExerciseEquipment(exercise, libraryExercises)}
                      </span>
                    </div>
                  </div>

                  {/* Top Right Action Icons: Close / Minimize, Replace, Remove */}
                  <div className="flex items-center gap-1">
                    <button
                      id={`collapse-btn-${exercise.id}`}
                      onClick={() => toggleCollapseExercise(exercise.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1f2133] transition-colors flex items-center gap-1 text-xs font-semibold"
                      title="Minimize exercise card"
                    >
                      <span className="hidden sm:inline text-[11px] text-slate-400">Close</span>
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    {onReplaceExercise && (
                      <button
                        onClick={() => {
                          setReplacingExerciseId(exercise.id);
                          setShowAddModal(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-theme-light hover:bg-[#1f2133] transition-colors"
                        title="Replace Exercise"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (unloggedWarning) setUnloggedWarning(null);
                        onRemoveExercise(exercise.id);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Remove Exercise"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Subtitle / Previous Note & Pale, Thin, Small Recommended Rest Chip */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-0.5">
                  <p className="text-xs text-slate-400">
                    {exPrev[0]
                      ? `Last session: ${exPrev[0]}`
                      : "First session. Your next visit will show today's results here."}
                  </p>

                  {/* Paler, thinner, smaller recommended rest chip */}
                  {(() => {
                    const restRec = getExerciseRestRecommendation(
                      exercise.name,
                      exercise.category,
                      getExerciseEquipment(exercise, libraryExercises)
                    );
                    return (
                      <div
                        id={`rest-rec-badge-${exercise.id}`}
                        onClick={() => onTriggerRestTimer(restRec.seconds)}
                        role="button"
                        tabIndex={0}
                        title={`Recommended rest: ${restRec.rangeLabel} (${restRec.tier}). Tap to set timer.`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 text-[11px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer group self-start sm:self-auto"
                      >
                        <Clock className="w-3 h-3 text-slate-500 group-hover:text-theme-light transition-colors flex-shrink-0" />
                        <span className="text-slate-500 font-medium">Rest:</span>
                        <span className="font-bold text-slate-300 group-hover:text-white font-mono">{restRec.rangeLabel}</span>
                        <span className="text-[10px] text-slate-500">·</span>
                        <span className="text-[10px] text-slate-400 font-medium">{restRec.tier}</span>
                        <span className="text-[10px] text-slate-500 group-hover:text-theme-light transition-colors ml-0.5 hidden sm:inline">
                          (Tap to set)
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* Double Progression Status & Weight Increase Reminder Area */}
                {progression.isGraduated ? (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                          <span>Increase your weight by {progression.weightInc} {unit}</span>
                          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-extrabold">
                            Graduated!
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-400/90 mt-0.5">
                          Hit {progression.maxReps} reps on all sets last session! Ready to bump from {progression.currentWeight} {unit} to <strong>{progression.suggestedWeight} {unit}</strong> (aim for {progression.minReps} reps today).
                        </p>
                      </div>
                    </div>
                    {exercise.sets.some((s) => !s.completed && s.weight !== progression.suggestedWeight) && (
                      <button
                        type="button"
                        onClick={() => {
                          exercise.sets.forEach((s) => {
                            if (!s.completed) {
                              onUpdateSet(exercise.id, s.id, 'weight', progression.suggestedWeight);
                              if (s.reps === '' || s.reps === undefined) {
                                onUpdateSet(exercise.id, s.id, 'reps', progression.minReps);
                              }
                            }
                          });
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-colors whitespace-nowrap self-start sm:self-center shadow-md cursor-pointer"
                      >
                        Apply {progression.suggestedWeight} {unit}
                      </button>
                    )}
                  </div>
                ) : progression.currentWeight !== null ? (
                  <div className="p-3 rounded-2xl bg-[#171827] border border-[#26283d] flex items-center gap-2.5 text-xs text-slate-300">
                    <Target className="w-4 h-4 text-theme-accent flex-shrink-0" />
                    <div className="text-[11px] leading-tight">
                      <span className="font-semibold text-white">Target: {progression.minReps}–{progression.maxReps} reps at {progression.currentWeight} {unit}.</span>
                      <span className="text-slate-400 ml-1">
                        {progression.lastReps.length > 0 ? `(Last: ${progression.lastReps.join(', ')} reps) ` : ''}
                        Hit <strong>{progression.maxReps} reps</strong> on all sets to graduate and increase weight by {progression.weightInc} {unit}.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-[#171827] border border-[#26283d] flex items-center gap-2.5 text-xs text-slate-300">
                    <Target className="w-4 h-4 text-theme-accent flex-shrink-0" />
                    <div className="text-[11px] leading-tight">
                      <span className="font-semibold text-white">Target Bracket: {progression.minReps}–{progression.maxReps} reps.</span>
                      <span className="text-slate-400 ml-1">
                        Find a working weight with 1–2 reps in reserve. Hit <strong>{progression.maxReps} reps</strong> across all sets to graduate and increase weight.
                      </span>
                    </div>
                  </div>
                )}

                {/* Table Header */}
                <div className="grid grid-cols-12 gap-2 text-[11px] font-bold uppercase text-slate-400 px-1 pt-1">
                  <span className="col-span-2">SET</span>
                  <span className="col-span-4 text-center">WEIGHT {unit.toUpperCase()}</span>
                  <span className="col-span-4 text-center">REPS</span>
                  <span className="col-span-2 text-center">LOG</span>
                </div>

                {/* Sets Rows */}
                <div className="space-y-2">
                  {exercise.sets.map((set, setIdx) => {
                    return (
                      <div
                        key={set.id}
                        id={`set-row-${set.id}`}
                        className="grid grid-cols-12 gap-2 items-center"
                      >
                        {/* Set Number */}
                        <div className="col-span-2 font-bold text-xs text-slate-400 pl-1">
                          {setIdx + 1}
                        </div>

                        {/* Weight Input */}
                        <div className="col-span-4">
                          <input
                            id={`set-weight-input-${set.id}`}
                            type="number"
                            inputMode="decimal"
                            step="any"
                            pattern="[0-9]*\.?[0-9]*"
                            placeholder={unit}
                            value={set.weight === '' ? '' : set.weight}
                            onChange={(e) =>
                              handleWeightOrRepsChange(exercise.id, set, 'weight', e.target.value)
                            }
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck={false}
                            className={`w-full py-2 text-center font-bold text-base sm:text-sm rounded-xl border focus:outline-none transition-colors ${
                              set.completed
                                ? 'bg-theme-accent-bg border-theme-border text-theme-light'
                                : 'bg-[#191a27] border-[#292b3d] text-white focus:border-theme-accent'
                            }`}
                          />
                        </div>

                        {/* Reps Input */}
                        <div className="col-span-4">
                          <input
                            id={`set-reps-input-${set.id}`}
                            type="number"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            step="1"
                            min="1"
                            placeholder="Reps"
                            value={set.reps === '' ? '' : set.reps}
                            onChange={(e) =>
                              handleWeightOrRepsChange(exercise.id, set, 'reps', e.target.value)
                            }
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck={false}
                            className={`w-full py-2 text-center font-bold text-base sm:text-sm rounded-xl border focus:outline-none transition-colors ${
                              set.completed
                                ? 'bg-theme-accent-bg border-theme-border text-theme-light'
                                : 'bg-[#191a27] border-[#292b3d] text-white focus:border-theme-accent'
                            }`}
                          />
                        </div>

                        {/* Plus button to log set (+ when unlogged, green checkmark when completed) */}
                        <div className="col-span-2 flex items-center justify-center">
                          {(() => {
                            const isBlank =
                              !set.completed &&
                              (set.weight === '' || set.reps === '' || Number(set.reps) <= 0);
                            return (
                              <button
                                id={`set-log-btn-${set.id}`}
                                onClick={() => handleToggleLogSet(exercise.id, set)}
                                title={
                                  set.completed
                                    ? 'Set logged (Tap to undo)'
                                    : isBlank
                                    ? 'Enter weight and reps to log set'
                                    : 'Tap + to log set'
                                }
                                className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all ${
                                  set.completed
                                    ? 'bg-theme-accent border-theme-accent text-[#0d0a18] shadow-md hover:opacity-90'
                                    : isBlank
                                    ? 'bg-[#151624] border-[#25273b] text-slate-500 hover:border-amber-500/40 hover:text-amber-300'
                                    : 'bg-[#191a27] border-[#2d2f44] text-theme-accent hover:border-theme-accent hover:bg-[#222438] active:scale-95'
                                }`}
                              >
                                {set.completed ? (
                                  <Check className="w-4 h-4 stroke-[3] text-[#0d0a18]" />
                                ) : (
                                  <Plus className={`w-4 h-4 stroke-[2.5] ${isBlank ? 'opacity-40' : ''}`} />
                                )}
                              </button>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Actions below sets: Repeat Last & Add Set & Remove Set */}
                <div className="flex items-center justify-between pt-1 text-xs gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      id={`repeat-last-btn-${exercise.id}`}
                      onClick={() => {
                        if (onRepeatLastSet) {
                          onRepeatLastSet(exercise.id);
                        } else {
                          onAddSet(exercise.id);
                        }
                      }}
                      className="font-bold text-xs text-white bg-[#191b29] hover:bg-[#222438] border border-[#2c2e46] hover:border-theme-accent px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
                      title="Copy the previous set's weight and reps into a new set"
                    >
                      <Copy className="w-3.5 h-3.5 text-theme-accent" />
                      <span>Repeat Last</span>
                    </button>

                    <button
                      id={`add-set-btn-${exercise.id}`}
                      onClick={() => onAddSet(exercise.id)}
                      className="text-slate-400 hover:text-white flex items-center gap-1 py-1 px-2 rounded-xl hover:bg-[#1a1b2a]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Set</span>
                    </button>
                  </div>

                  {exercise.sets.length > 1 && (
                    <button
                      onClick={() => {
                        if (unloggedWarning) setUnloggedWarning(null);
                        onRemoveSet(exercise.id, exercise.sets[exercise.sets.length - 1].id);
                      }}
                      className="text-slate-500 hover:text-rose-400 py-1 px-2"
                    >
                      Remove Set
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Actions: Add Exercise & Finish Workout Buttons */}
      {exercises.length > 0 && (
        <div className="space-y-2.5 pt-1 pb-6">
          <button
            id="add-exercise-btn"
            onClick={() => {
              setReplacingExerciseId(null);
              setShowAddModal(true);
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#141520] hover:bg-[#191b29] border border-[#242638] text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 text-theme-accent" />
            <span>Add Exercise</span>
          </button>

          <button
            id="bottom-finish-workout-btn"
            onClick={handleAttemptFinish}
            className={`w-full py-3.5 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
              isAllFullyLogged
                ? 'btn-theme-primary'
                : 'bg-[#181926] hover:bg-[#202234] text-slate-300 border border-[#2e3046]'
            }`}
            title={
              isAllFullyLogged
                ? 'Finish and save workout'
                : 'All sets across all exercises must be fully logged to finish'
            }
          >
            <Check className="w-4 h-4" />
            <span>Finish Workout</span>
          </button>
        </div>
      )}

      {/* Exercise Picker Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#12131d] border border-[#222436] rounded-t-3xl sm:rounded-3xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#222436] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  {replacingExerciseId ? 'Replace Exercise' : 'Add Exercise'}
                </h3>
                <p className="text-xs text-slate-400">
                  {replacingExerciseId
                    ? 'Pick an exercise to substitute in this slot'
                    : 'Select an exercise to start logging (preloads last week\'s weight & reps)'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setReplacingExerciseId(null);
                  setShowCreateCustom(false);
                }}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Custom Exercise Form Switcher */}
            {showCreateCustom ? (
              <form onSubmit={handleCreateAndAddCustom} className="p-4 space-y-3 overflow-y-auto">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Exercise Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Incline Dumbbell Hammer Curl"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#191a27] border border-[#282a3d] text-base sm:text-xs text-white focus:border-theme-accent focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Muscle Group</label>
                    <select
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value as MuscleCategory)}
                      className="w-full px-3 py-2 rounded-xl bg-[#191a27] border border-[#282a3d] text-xs text-white focus:outline-none"
                    >
                      {categories
                        .filter((c) => c !== 'All')
                        .map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Equipment</label>
                    <select
                      value={customEquipment}
                      onChange={(e) => setCustomEquipment(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-[#191a27] border border-[#282a3d] text-xs text-white focus:outline-none"
                    >
                      <option value="Dumbbell">Dumbbell</option>
                      <option value="Barbell">Barbell</option>
                      <option value="Cable">Cable</option>
                      <option value="Machine">Machine</option>
                      <option value="Bodyweight">Bodyweight</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateCustom(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
                  >
                    Back to Library
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl btn-theme-primary text-xs font-bold shadow-md"
                  >
                    Save & Add (3 Sets)
                  </button>
                </div>
              </form>
            ) : (
              <>
                {/* Search Bar & Custom Button */}
                <div className="p-3 border-b border-[#222436] space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search exercises..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#191a27] border border-[#282a3d] text-base sm:text-xs text-white placeholder-slate-500 focus:border-theme-accent focus:outline-none"
                    />
                  </div>

                  {/* Muscle category filter pills */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1 rounded-xl whitespace-nowrap text-[11px] font-semibold transition-colors ${
                          selectedCategory === cat
                            ? 'bg-theme-accent text-[#0d0a18]'
                            : 'bg-[#191a27] text-slate-400 hover:text-white'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Exercises list */}
                <div className="overflow-y-auto flex-1 p-2 space-y-1 max-h-[50vh]">
                  {filteredLibrary.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectExerciseFromModal(item)}
                      className="p-3 rounded-2xl hover:bg-[#1a1b2a] cursor-pointer flex items-center justify-between border border-transparent hover:border-[#282a3d] transition-all"
                    >
                      <div>
                        <div className="text-xs font-bold text-white">{item.name}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {item.category} · {item.equipment || 'Gym'}
                        </div>
                      </div>
                      <Plus className="w-4 h-4 text-theme-accent" />
                    </div>
                  ))}

                  {filteredLibrary.length === 0 && (
                    <div className="text-center py-8 text-xs text-slate-400 space-y-2">
                      <p>No matching exercises found.</p>
                      <button
                        onClick={() => {
                          setCustomName(searchQuery);
                          setShowCreateCustom(true);
                        }}
                        className="py-2 px-4 rounded-xl btn-theme-primary text-xs font-bold"
                      >
                        Create "{searchQuery || 'Custom'}" Exercise
                      </button>
                    </div>
                  )}
                </div>

                {/* Create Custom Action footer */}
                <div className="p-3 border-t border-[#222436] text-center">
                  <button
                    onClick={() => setShowCreateCustom(true)}
                    className="text-xs font-bold text-theme-light hover:underline"
                  >
                    + Create a custom exercise
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
