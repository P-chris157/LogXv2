import React, { useState, useEffect, useRef } from 'react';
import {
  ActiveExercise,
  AICritique,
  CompletedWorkout,
  ExerciseTemplate,
  MuscleCategory,
  PrescribedNextWorkout,
  TabType,
  TrainingRoutine,
  UserSettings,
  WorkoutSet,
} from './types';
import { DEFAULT_EXERCISES } from './data/defaultExercises';
import { getRoutineShortTitle } from './data/trainingPlans';
import { getExerciseProgressionStatus } from './services/doubleProgression';
import {
  DEFAULT_SETTINGS,
  getPreviousExerciseReference,
  getPreviousExerciseValues,
  loadActiveWorkoutState,
  loadCustomExercises,
  loadSettings,
  loadTrainingPlans,
  loadWorkouts,
  saveActiveWorkoutState,
  saveCustomExercises,
  saveSettings,
  saveWorkouts,
} from './services/storage';
import { generateWorkoutCritique } from './services/aiCoach';
import { applyAppTheme } from './services/theme';
import { soundService } from './services/sound';
import { Navigation } from './components/Navigation';
import { HomeTab } from './components/HomeTab';
import { ActiveWorkout } from './components/ActiveWorkout';
import { PlanTab } from './components/PlanTab';
import { HistoryTab } from './components/HistoryTab';
import { AICoachTab } from './components/AICoachTab';
import { SettingsTab } from './components/SettingsTab';
import { WorkoutSummaryModal } from './components/WorkoutSummaryModal';
import { StartWorkoutModal } from './components/StartWorkoutModal';
import { Dumbbell, Smartphone, BellRing, X, ArrowRight, Settings } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('home');

  // Persistence data states
  const [settings, setSettings] = useState<UserSettings>(() => loadSettings());
  const [workoutsHistory, setWorkoutsHistory] = useState<CompletedWorkout[]>(() => loadWorkouts());
  const [customExercises, setCustomExercises] = useState<ExerciseTemplate[]>(() =>
    loadCustomExercises()
  );

  // Active workout state
  const [isWorkoutStarted, setIsWorkoutStarted] = useState<boolean>(false);
  const [workoutTitle, setWorkoutTitle] = useState<string>('Freestyle workout');
  const [activeExercises, setActiveExercises] = useState<ActiveExercise[]>([]);
  const [workoutDurationSeconds, setWorkoutDurationSeconds] = useState<number>(0);
  const [workoutStartTime, setWorkoutStartTime] = useState<number | null>(null);

  // Global persistent rest timer state (preserves across tab switches!)
  const [configuredRestDuration, setConfiguredRestDuration] = useState<number>(
    () => settings.defaultRestSeconds || 120
  );
  const [restSecondsRemaining, setRestSecondsRemaining] = useState<number>(
    () => settings.defaultRestSeconds || 120
  );
  const [isRestRunning, setIsRestRunning] = useState<boolean>(false);
  const [restTargetTimestamp, setRestTargetTimestamp] = useState<number | null>(null);
  const [restNotification, setRestNotification] = useState<string | null>(null);
  const prevDefaultRestSecondsRef = useRef(settings.defaultRestSeconds);

  // Completion / AI Critique Modal state
  const [summaryModalOpen, setSummaryModalOpen] = useState<boolean>(false);
  const [latestCompletedWorkout, setLatestCompletedWorkout] = useState<CompletedWorkout | null>(
    null
  );
  const [latestCritique, setLatestCritique] = useState<AICritique | null>(null);
  const [isAnalyzingCritique, setIsAnalyzingCritique] = useState<boolean>(false);

  // Optional Workout Naming Modal state
  const [startWorkoutModalOpen, setStartWorkoutModalOpen] = useState<boolean>(false);
  const [pendingRoutineToStart, setPendingRoutineToStart] = useState<TrainingRoutine | null>(null);
  const [promptInitialTitle, setPromptInitialTitle] = useState<string>('Freestyle workout');
  const [selectedPlanRoutineId, setSelectedPlanRoutineId] = useState<string>('workout-a');

  // Apply active appearance theme to DOM root
  useEffect(() => {
    applyAppTheme(settings.theme || 'midnight');
  }, [settings.theme]);

  // Sync rest timer default ONLY when settings.defaultRestSeconds is changed in Settings
  useEffect(() => {
    if (prevDefaultRestSecondsRef.current !== settings.defaultRestSeconds) {
      prevDefaultRestSecondsRef.current = settings.defaultRestSeconds;
      const newDuration = settings.defaultRestSeconds || 120;
      setConfiguredRestDuration(newDuration);
      if (!isRestRunning) {
        setRestSecondsRemaining(newDuration);
      }
    }
  }, [settings.defaultRestSeconds, isRestRunning]);

  // Global Rest Timer countdown interval (runs regardless of current tab)
  useEffect(() => {
    if (!isRestRunning || !restTargetTimestamp) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((restTargetTimestamp - now) / 1000));

      setRestSecondsRemaining(diff);

      if (diff <= 0) {
        clearInterval(interval);
        setIsRestRunning(false);
        setRestTargetTimestamp(null);
        setRestSecondsRemaining(configuredRestDuration || settings.defaultRestSeconds || 120);

        if (settings.soundEnabled) {
          soundService.playRestFinishedBeep();
        }

        // Show rest finish banner notification
        setRestNotification('Rest period complete! Ready for your next set.');
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isRestRunning, restTargetTimestamp, configuredRestDuration, settings.defaultRestSeconds, settings.soundEnabled]);

  // Restore active workout state on mount if saved
  useEffect(() => {
    const savedState = loadActiveWorkoutState();
    if (savedState && savedState.isStarted) {
      setIsWorkoutStarted(true);
      let initialTitle = savedState.title || 'Freestyle workout';
      initialTitle = initialTitle.replace(/\s*\((Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\)/gi, '');
      if (initialTitle.startsWith('Workout A:')) initialTitle = 'Workout A';
      if (initialTitle.startsWith('Workout B:')) initialTitle = 'Workout B';
      if (initialTitle.startsWith('Workout C:')) initialTitle = 'Workout C';
      setWorkoutTitle(initialTitle);
      setActiveExercises(savedState.exercises || []);
      const start = savedState.startTime || (Date.now() - (savedState.durationSeconds || 0) * 1000);
      setWorkoutStartTime(start);
      const elapsed = Math.floor((Date.now() - start) / 1000);
      setWorkoutDurationSeconds(Math.max(0, elapsed));
    }
  }, []);

  // Save settings when modified
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Save custom exercises when modified
  useEffect(() => {
    saveCustomExercises(customExercises);
  }, [customExercises]);

  // Save workouts history when modified
  useEffect(() => {
    saveWorkouts(workoutsHistory);
  }, [workoutsHistory]);

  // Active workout duration timer (accurate to wall-clock, no background drift)
  useEffect(() => {
    if (!isWorkoutStarted || !workoutStartTime) return;

    const updateTimer = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - workoutStartTime) / 1000));
      setWorkoutDurationSeconds(elapsed);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isWorkoutStarted, workoutStartTime]);

  // Auto-save active workout state (triggers on structure updates, not on every second)
  useEffect(() => {
    if (isWorkoutStarted && workoutStartTime) {
      saveActiveWorkoutState({
        isStarted: true,
        title: workoutTitle,
        exercises: activeExercises,
        startTime: workoutStartTime,
      });
    } else {
      saveActiveWorkoutState(null);
    }
  }, [isWorkoutStarted, workoutTitle, activeExercises, workoutStartTime]);

  // Combine default and custom exercises
  const allExercises = [...DEFAULT_EXERCISES, ...customExercises];

  // Map previous references for active exercises
  const previousReferencesMap: { [exerciseName: string]: { [setIndex: number]: string } } = {};
  activeExercises.forEach((ex) => {
    previousReferencesMap[ex.name] = getPreviousExerciseReference(ex.name, workoutsHistory);
  });

  // Calculate completed set count for navigation badge
  const totalCompletedSetsInActive = activeExercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.completed).length,
    0
  );

  // Global Rest Timer control functions
  const handleTriggerRestTimer = (customDuration?: number) => {
    if (!settings.restTimerEnabled) return;
    const duration = customDuration ?? settings.defaultRestSeconds ?? 120;
    setConfiguredRestDuration(duration);
    setRestSecondsRemaining(duration);
    setRestTargetTimestamp(Date.now() + duration * 1000);
    setIsRestRunning(true);
    setRestNotification(null);
  };

  const handleToggleRestTimer = () => {
    if (!settings.restTimerEnabled) return;
    if (isRestRunning) {
      // Pause: Keep restSecondsRemaining at current countdown point without resetting
      setIsRestRunning(false);
      setRestTargetTimestamp(null);
    } else {
      // Resume from paused second or start from configured duration
      const secs =
        restSecondsRemaining > 0
          ? restSecondsRemaining
          : configuredRestDuration || settings.defaultRestSeconds || 120;
      setRestSecondsRemaining(secs);
      setRestTargetTimestamp(Date.now() + secs * 1000);
      setIsRestRunning(true);
      setRestNotification(null);
    }
  };

  const handleAdjustRestTimer = (deltaSeconds: number) => {
    if (!settings.restTimerEnabled) return;
    const newRemaining = Math.max(5, restSecondsRemaining + deltaSeconds);
    setRestSecondsRemaining(newRemaining);
    if (isRestRunning) {
      setRestTargetTimestamp(Date.now() + newRemaining * 1000);
    }
  };

  const handleResetRestTimer = () => {
    if (!settings.restTimerEnabled) return;
    const duration = configuredRestDuration || settings.defaultRestSeconds || 120;
    setRestSecondsRemaining(duration);
    if (isRestRunning) {
      setRestTargetTimestamp(Date.now() + duration * 1000);
    } else {
      setRestTargetTimestamp(null);
    }
  };

  // Workout Action Handlers: Optional prompt to name workout first
  const handlePromptStartFreestyle = () => {
    setPendingRoutineToStart(null);
    setPromptInitialTitle('Freestyle workout');
    setStartWorkoutModalOpen(true);
  };

  const handlePromptStartRoutine = (routine: TrainingRoutine) => {
    setPendingRoutineToStart(routine);
    const shortTitle = getRoutineShortTitle(routine);
    setPromptInitialTitle(shortTitle);
    setStartWorkoutModalOpen(true);
  };

  const handleConfirmStartWorkout = (customTitle: string) => {
    setStartWorkoutModalOpen(false);
    if (pendingRoutineToStart) {
      executeStartRoutine(pendingRoutineToStart, customTitle);
    } else {
      executeStartFreestyle(customTitle);
    }
  };

  const executeStartFreestyle = (title?: string) => {
    const now = Date.now();
    setIsWorkoutStarted(true);
    setWorkoutStartTime(now);
    setWorkoutDurationSeconds(0);
    setWorkoutTitle(title || 'Freestyle workout');
    setActiveExercises([]);
    setCurrentTab('workout');
  };

  const executeStartRoutine = (routine: TrainingRoutine, title?: string) => {
    if (!routine) return;
    const now = Date.now();
    setIsWorkoutStarted(true);
    setWorkoutStartTime(now);
    setWorkoutDurationSeconds(0);
    const shortTitle = getRoutineShortTitle(routine);
    const finalTitle = title && title !== routine?.title ? title : shortTitle;
    setWorkoutTitle(finalTitle);

    const routineExercises: ActiveExercise[] = routine.exercises.map((target, idx) => {
      const prevMap = getPreviousExerciseReference(target.name, workoutsHistory);
      const prevVals = getPreviousExerciseValues(target.name, workoutsHistory);
      const progression = getExerciseProgressionStatus(target.name, target.category, workoutsHistory, settings.unit);

      const initialWeight = progression.isGraduated && progression.suggestedWeight !== null
        ? progression.suggestedWeight
        : prevVals ? prevVals.weight : '';
      const initialReps = progression.isGraduated
        ? progression.minReps
        : prevVals ? prevVals.reps : '';

      // Start with 1 set initialized with previous session's weight and reps, ready for "Repeat Last"!
      const sets: WorkoutSet[] = [
        {
          id: `s-${idx}-0-${Date.now()}`,
          setNumber: 1,
          weight: initialWeight,
          reps: initialReps,
          completed: false,
          previous: prevMap[0] || (prevVals ? `${prevVals.weight} ${settings.unit} x ${prevVals.reps}${progression.isGraduated ? ` (Graduated! +${progression.weightInc} ${settings.unit})` : ''}` : undefined),
        },
      ];

      let resolvedEquipment = target.equipment || 'Barbell';
      const nameLower = target.name.toLowerCase();
      if (nameLower.includes('barbell')) resolvedEquipment = 'Barbell';
      else if (nameLower.includes('dumbbell')) resolvedEquipment = 'Dumbbell';
      else if (nameLower.includes('cable')) resolvedEquipment = 'Cable';
      else if (nameLower.includes('machine')) resolvedEquipment = 'Machine';
      else if (nameLower.includes('bodyweight')) resolvedEquipment = 'Bodyweight';

      return {
        id: `ex-${idx}-${Date.now()}`,
        exerciseId: target.name.toLowerCase().replace(/\s+/g, '-'),
        name: target.name,
        category: target.category,
        equipment: resolvedEquipment,
        sets,
      };
    });

    setActiveExercises(routineExercises);
    setCurrentTab('workout');
  };

  const handleStartPrescribedFreestyle = (prescription: PrescribedNextWorkout) => {
    const now = Date.now();
    setIsWorkoutStarted(true);
    setWorkoutStartTime(now);
    setWorkoutDurationSeconds(0);
    setWorkoutTitle(prescription.recommendedSplit);

    const routineExercises: ActiveExercise[] = (prescription.exercises || []).map((target, idx) => {
      const prevMap = getPreviousExerciseReference(target.exerciseName, workoutsHistory);
      const prevVals = getPreviousExerciseValues(target.exerciseName, workoutsHistory);

      const targetWeightNum =
        typeof target.targetWeight === 'number' ? target.targetWeight : prevVals?.weight ?? '';
      const targetRepsNum = prevVals ? prevVals.reps : '';

      const sets: WorkoutSet[] = [
        {
          id: `s-${idx}-0-${Date.now()}`,
          setNumber: 1,
          weight: targetWeightNum,
          reps: targetRepsNum,
          completed: false,
          previous:
            prevMap[0] ||
            (prevVals ? `${prevVals.weight} ${settings.unit} x ${prevVals.reps}` : undefined),
        },
      ];

      let resolvedEquipment = 'Barbell';
      const nameLower = target.exerciseName.toLowerCase();
      if (nameLower.includes('barbell')) resolvedEquipment = 'Barbell';
      else if (nameLower.includes('dumbbell')) resolvedEquipment = 'Dumbbell';
      else if (nameLower.includes('cable')) resolvedEquipment = 'Cable';
      else if (nameLower.includes('machine') || nameLower.includes('press'))
        resolvedEquipment = 'Machine';
      else if (
        nameLower.includes('bodyweight') ||
        nameLower.includes('raise') ||
        nameLower.includes('pull-up')
      )
        resolvedEquipment = 'Bodyweight';

      return {
        id: `ex-${idx}-${Date.now()}`,
        exerciseId: target.exerciseName.toLowerCase().replace(/\s+/g, '-'),
        name: target.exerciseName,
        category: target.category as MuscleCategory,
        equipment: resolvedEquipment,
        sets,
      };
    });

    setActiveExercises(routineExercises);
    setCurrentTab('workout');
  };

  const handleFinishWorkout = async () => {
    if (activeExercises.length === 0) return;

    // Safety validation: Ensure every exercise has at least one logged set and all sets are completed
    const hasUncompletedSets = activeExercises.some(
      (ex) => ex.sets.length === 0 || ex.sets.some((s) => !s.completed)
    );
    if (hasUncompletedSets) {
      return;
    }

    const totalSecs = workoutDurationSeconds;
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const durationFormatted = `${mins}m ${secs}s`;

    let totalVolume = 0;
    let completedSetsCount = 0;

    activeExercises.forEach((ex) => {
      ex.sets.forEach((s) => {
        if (s.completed && typeof s.weight === 'number' && typeof s.reps === 'number') {
          totalVolume += s.weight * s.reps;
          completedSetsCount += 1;
        }
      });
    });

    const finishedWorkout: CompletedWorkout = {
      id: `w-${Date.now()}`,
      title: workoutTitle || 'Freestyle workout',
      startTime: Date.now() - totalSecs * 1000,
      endTime: Date.now(),
      durationSeconds: totalSecs,
      durationFormatted,
      totalVolume,
      unit: settings.unit,
      completedSetsCount,
      exercises: activeExercises,
    };

    // Open summary modal in loading state
    setLatestCompletedWorkout(finishedWorkout);
    setLatestCritique(null);
    setIsAnalyzingCritique(true);
    setSummaryModalOpen(true);

    // Reset active workout
    setIsWorkoutStarted(false);
    setWorkoutStartTime(null);
    setActiveExercises([]);
    setWorkoutDurationSeconds(0);
    setIsRestRunning(false);
    setRestTargetTimestamp(null);
    setRestNotification(null);
    saveActiveWorkoutState(null);
    setCurrentTab('coach');

    // Trigger AI Critique generation with historical context for double progression
    try {
      const critique = await generateWorkoutCritique(
        finishedWorkout,
        settings.geminiApiKey,
        workoutsHistory
      );
      finishedWorkout.critique = critique;
      setLatestCritique(critique);
      setWorkoutsHistory((prev) => [finishedWorkout, ...prev]);
    } catch (err) {
      console.error('Error analyzing workout with AI', err);
      setWorkoutsHistory((prev) => [finishedWorkout, ...prev]);
    } finally {
      setIsAnalyzingCritique(false);
    }
  };

  const handleDiscardWorkout = () => {
    setIsWorkoutStarted(false);
    setWorkoutStartTime(null);
    setActiveExercises([]);
    setWorkoutDurationSeconds(0);
    setIsRestRunning(false);
    setRestTargetTimestamp(null);
    setRestNotification(null);
    saveActiveWorkoutState(null);
    setCurrentTab('home');
  };

  // Add exercise to workout: starts with 1 set prefilled with previous weight & reps
  const handleAddExerciseToWorkout = (template: ExerciseTemplate) => {
    if (!isWorkoutStarted) {
      const now = Date.now();
      setIsWorkoutStarted(true);
      setWorkoutStartTime(now);
      setWorkoutDurationSeconds(0);
    }

    const prevMap = getPreviousExerciseReference(template.name, workoutsHistory);
    const prevVals = getPreviousExerciseValues(template.name, workoutsHistory);
    const progression = getExerciseProgressionStatus(template.name, template.category, workoutsHistory, settings.unit);

    const initialWeight = progression.isGraduated && progression.suggestedWeight !== null
      ? progression.suggestedWeight
      : prevVals ? prevVals.weight : '';
    const initialReps = progression.isGraduated
      ? progression.minReps
      : prevVals ? prevVals.reps : '';

    // Starts with 1 single set initialized with last session's weight and reps!
    const defaultSets: WorkoutSet[] = [
      {
        id: `s-1-${Date.now()}`,
        setNumber: 1,
        weight: initialWeight,
        reps: initialReps,
        completed: false,
        previous: prevMap[0] || (prevVals ? `${prevVals.weight} ${settings.unit} x ${prevVals.reps}${progression.isGraduated ? ` (Graduated! +${progression.weightInc} ${settings.unit})` : ''}` : undefined),
      },
    ];

    let resolvedEquipment = template.equipment || 'Barbell';
    const nameLower = template.name.toLowerCase();
    if (nameLower.includes('barbell')) resolvedEquipment = 'Barbell';
    else if (nameLower.includes('dumbbell')) resolvedEquipment = 'Dumbbell';
    else if (nameLower.includes('cable')) resolvedEquipment = 'Cable';
    else if (nameLower.includes('machine')) resolvedEquipment = 'Machine';
    else if (nameLower.includes('bodyweight')) resolvedEquipment = 'Bodyweight';

    const newExercise: ActiveExercise = {
      id: `ex-inst-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      exerciseId: template.id,
      name: template.name,
      category: template.category,
      equipment: resolvedEquipment,
      sets: defaultSets,
    };

    setActiveExercises((prev) => [...prev, newExercise]);
    setCurrentTab('workout');
  };

  const handleReplaceExercise = (exerciseInstanceId: string, newTemplate: ExerciseTemplate) => {
    const prevMap = getPreviousExerciseReference(newTemplate.name, workoutsHistory);
    const prevVals = getPreviousExerciseValues(newTemplate.name, workoutsHistory);

    let resolvedEquipment = newTemplate.equipment || 'Barbell';
    const nameLower = newTemplate.name.toLowerCase();
    if (nameLower.includes('barbell')) resolvedEquipment = 'Barbell';
    else if (nameLower.includes('dumbbell')) resolvedEquipment = 'Dumbbell';
    else if (nameLower.includes('cable')) resolvedEquipment = 'Cable';
    else if (nameLower.includes('machine')) resolvedEquipment = 'Machine';
    else if (nameLower.includes('bodyweight')) resolvedEquipment = 'Bodyweight';

    setActiveExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseInstanceId) return ex;
        return {
          ...ex,
          exerciseId: newTemplate.id,
          name: newTemplate.name,
          category: newTemplate.category,
          equipment: resolvedEquipment,
          sets: ex.sets.map((s, idx) => ({
            ...s,
            weight: s.weight === '' && prevVals ? prevVals.weight : s.weight,
            reps: s.reps === '' && prevVals ? prevVals.reps : s.reps,
            previous: prevMap[idx] || (idx === 0 && prevVals ? `${prevVals.weight} ${settings.unit} x ${prevVals.reps}` : undefined),
          })),
        };
      })
    );
  };

  const handleReorderExercise = (currentIndex: number, direction: 'up' | 'down') => {
    setActiveExercises((prev) => {
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[currentIndex];
      copy[currentIndex] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleRemoveExercise = (exerciseInstanceId: string) => {
    setActiveExercises((prev) => prev.filter((e) => e.id !== exerciseInstanceId));
  };

  // Add a new empty or sequential set
  const handleAddSet = (exerciseInstanceId: string) => {
    setActiveExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseInstanceId) return ex;
        const lastSet = ex.sets[ex.sets.length - 1];
        const nextSetNum = ex.sets.length + 1;
        const prevRef = getPreviousExerciseReference(ex.name, workoutsHistory)[nextSetNum - 1];

        const newSet: WorkoutSet = {
          id: `s-${nextSetNum}-${Date.now()}`,
          setNumber: nextSetNum,
          weight: lastSet ? lastSet.weight : '',
          reps: '',
          completed: false,
          previous: prevRef,
        };
        return { ...ex, sets: [...ex.sets, newSet] };
      })
    );
  };

  // Repeat Last: Duplicate the previous set's weight & reps into a new set
  const handleRepeatLastSet = (exerciseInstanceId: string) => {
    setActiveExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseInstanceId) return ex;
        const lastSet = ex.sets[ex.sets.length - 1];
        const nextSetNum = ex.sets.length + 1;
        const prevRef = getPreviousExerciseReference(ex.name, workoutsHistory)[nextSetNum - 1];
        const lastSetSummary =
          lastSet && lastSet.weight !== '' && lastSet.reps !== ''
            ? `${lastSet.weight} x ${lastSet.reps}`
            : undefined;

        const newSet: WorkoutSet = {
          id: `s-${nextSetNum}-${Date.now()}`,
          setNumber: nextSetNum,
          weight: lastSet ? lastSet.weight : '',
          reps: lastSet ? lastSet.reps : '',
          completed: false,
          previous: prevRef || lastSetSummary,
        };
        return { ...ex, sets: [...ex.sets, newSet] };
      })
    );
  };

  const handleRemoveSet = (exerciseInstanceId: string, setId: string) => {
    setActiveExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseInstanceId) return ex;
        if (ex.sets.length <= 1) return ex;
        const filtered = ex.sets.filter((s) => s.id !== setId);
        return {
          ...ex,
          sets: filtered.map((s, idx) => ({ ...s, setNumber: idx + 1 })),
        };
      })
    );
  };

  const handleUpdateSet = (
    exerciseInstanceId: string,
    setId: string,
    field: 'weight' | 'reps' | 'completed',
    value: any
  ) => {
    setActiveExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseInstanceId) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s) => (s.id === setId ? { ...s, [field]: value } : s)),
        };
      })
    );
  };

  const handleToggleUnit = () => {
    const newUnit = settings.unit === 'lbs' ? 'kg' : 'lbs';
    setSettings((prev) => ({ ...prev, unit: newUnit }));
  };

  const handleAddCustomExercise = (newEx: Omit<ExerciseTemplate, 'id'>) => {
    const created: ExerciseTemplate = {
      ...newEx,
      id: `custom-${Date.now()}`,
    };
    setCustomExercises((prev) => [created, ...prev]);
  };

  const handleDeleteWorkout = (id: string) => {
    setWorkoutsHistory((prev) => prev.filter((w) => w.id !== id));
  };

  const handleImportBackup = (imported: {
    settings?: UserSettings;
    workouts?: CompletedWorkout[];
    customExercises?: ExerciseTemplate[];
  }) => {
    if (imported.settings) setSettings(imported.settings);
    if (imported.workouts) setWorkoutsHistory(imported.workouts);
    if (imported.customExercises) setCustomExercises(imported.customExercises);
  };

  const handleClearAllData = () => {
    setWorkoutsHistory([]);
    setCustomExercises([]);
    setSettings(DEFAULT_SETTINGS);
    setIsWorkoutStarted(false);
    setWorkoutStartTime(null);
    setActiveExercises([]);
    setWorkoutDurationSeconds(0);
    setIsRestRunning(false);
    setRestTargetTimestamp(null);
    setRestNotification(null);
    localStorage.clear();
    setCurrentTab('home');
  };

  return (
    <div className="min-h-screen bg-[#0d0e15] text-slate-100 flex flex-col justify-between selection:bg-theme-accent/30 selection:text-theme-light">
      {/* Mobile Frame Container */}
      <div className="w-full max-w-md mx-auto min-h-screen flex flex-col px-4 pt-3 pb-24 relative shadow-2xl">
        {/* Top Header Bar */}
        <header className="flex items-center justify-between py-2 mb-2 border-b border-[#202234]">
          {/* Logo & Name */}
          <div
            onClick={() => setCurrentTab('home')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-theme-accent-bg border border-theme-border text-theme-light flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <Dumbbell className="w-4 h-4" />
            </div>
            <h1 className="text-lg font-black tracking-tight text-white leading-none">
              Log<span className="text-theme-accent">X</span>
            </h1>
          </div>

          {/* Right: Device indicator + Settings Button */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
              <Smartphone className="w-3 h-3 text-slate-400 flex-shrink-0" />
              <span>Saved on this device</span>
            </div>

            <button
              id="header-settings-btn"
              onClick={() => setCurrentTab(currentTab === 'settings' ? 'home' : 'settings')}
              className={`w-8 h-8 rounded-full border text-xs font-bold flex items-center justify-center transition-all ${
                currentTab === 'settings'
                  ? 'btn-theme-primary shadow-sm'
                  : 'bg-[#1a1b2a] border-[#292d42] text-slate-300 hover:text-white hover:border-theme-accent'
              }`}
              title="Settings & Preferences"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Rest Timer Finished Notification Banner */}
        {restNotification && (
          <div className="mb-3 p-3 rounded-2xl bg-theme-accent-bg border border-theme-border text-white text-xs flex items-center justify-between shadow-xl animate-fadeIn">
            <div className="flex items-center gap-2">
              <BellRing className="w-4 h-4 text-theme-accent animate-bounce" />
              <span className="font-semibold">{restNotification}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {currentTab !== 'workout' && (
                <button
                  onClick={() => {
                    setCurrentTab('workout');
                    setRestNotification(null);
                  }}
                  className="px-2.5 py-1 rounded-xl btn-theme-primary text-[11px] font-bold flex items-center gap-1"
                >
                  <span>Go to workout</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={() => setRestNotification(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Tab Content Views */}
        <main className="flex-1">
          {currentTab === 'home' && (
            <HomeTab
              onStartFreestyle={handlePromptStartFreestyle}
              onViewRoutine={() => {
                const plans = loadTrainingPlans();
                const nextIdx = workoutsHistory.length % (plans.length || 1);
                const nextPlan = plans[nextIdx] || plans[0];
                if (nextPlan) {
                  setSelectedPlanRoutineId(nextPlan.id);
                }
                setCurrentTab('plan');
              }}
              onStartRoutine={handlePromptStartRoutine}
              onNavigateToWorkout={() => setCurrentTab('workout')}
              isWorkoutActive={isWorkoutStarted}
              activeExercisesCount={activeExercises.length}
              activeSetsCount={activeExercises.reduce((sum, e) => sum + e.sets.length, 0)}
              workouts={workoutsHistory}
              onOpenSettings={() => setCurrentTab('settings')}
            />
          )}

          {currentTab === 'workout' && (
            <ActiveWorkout
              exercises={activeExercises}
              isStarted={isWorkoutStarted}
              durationSeconds={workoutDurationSeconds}
              unit={settings.unit}
              soundEnabled={settings.soundEnabled}
              autoCollapseCompleted={settings.autoCollapseCompleted !== false}
              previousReferences={previousReferencesMap}
              libraryExercises={allExercises}
              workoutsHistory={workoutsHistory}
              onStartWorkout={handlePromptStartFreestyle}
              onFinishWorkout={handleFinishWorkout}
              onDiscardWorkout={handleDiscardWorkout}
              onAddExerciseToWorkout={handleAddExerciseToWorkout}
              onRemoveExercise={handleRemoveExercise}
              onAddSet={handleAddSet}
              onRepeatLastSet={handleRepeatLastSet}
              onRemoveSet={handleRemoveSet}
              onUpdateSet={handleUpdateSet}
              onToggleUnit={handleToggleUnit}
              workoutTitle={workoutTitle}
              onChangeTitle={setWorkoutTitle}
              onReorderExercise={handleReorderExercise}
              onReplaceExercise={handleReplaceExercise}
              onAddNewCustomExercise={handleAddCustomExercise}
              configuredRestDuration={configuredRestDuration}
              restTimerEnabled={settings.restTimerEnabled}
              restSecondsRemaining={restSecondsRemaining}
              isRestRunning={isRestRunning}
              onToggleRestTimer={handleToggleRestTimer}
              onAdjustRestTimer={handleAdjustRestTimer}
              onResetRestTimer={handleResetRestTimer}
              onTriggerRestTimer={handleTriggerRestTimer}
            />
          )}

          {currentTab === 'plan' && (
            <PlanTab
              onStartRoutine={handlePromptStartRoutine}
              selectedRoutineId={selectedPlanRoutineId}
              onSelectRoutineId={setSelectedPlanRoutineId}
            />
          )}

          {currentTab === 'history' && (
            <HistoryTab
              workouts={workoutsHistory}
              onDeleteWorkout={handleDeleteWorkout}
              onStartNewWorkout={handlePromptStartFreestyle}
            />
          )}

          {currentTab === 'coach' && (
            <AICoachTab
              recentWorkout={workoutsHistory[0] || null}
              settings={settings}
              onNavigateToWorkout={() => setCurrentTab('workout')}
              onNavigateToPlanWithRoutine={(routineId) => {
                setSelectedPlanRoutineId(routineId);
                setCurrentTab('plan');
              }}
              onStartPrescribedFreestyle={handleStartPrescribedFreestyle}
              isAnalyzingCritique={isAnalyzingCritique}
              pendingWorkoutTitle={isAnalyzingCritique ? latestCompletedWorkout?.title : undefined}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsTab
              settings={settings}
              onUpdateSettings={setSettings}
              workouts={workoutsHistory}
              customExercises={customExercises}
              onImportBackup={handleImportBackup}
              onClearAllData={handleClearAllData}
            />
          )}
        </main>

        {/* Bottom Tab Navigation */}
        <Navigation
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          isWorkoutActive={isWorkoutStarted}
          activeSetsCount={totalCompletedSetsInActive}
        />

        {/* Optional Start Workout Naming Modal */}
        <StartWorkoutModal
          isOpen={startWorkoutModalOpen}
          initialTitle={promptInitialTitle}
          onConfirm={handleConfirmStartWorkout}
          onCancel={() => setStartWorkoutModalOpen(false)}
        />

        {/* Workout Complete AI Summary Modal */}
        {summaryModalOpen && (
          <WorkoutSummaryModal
            workout={latestCompletedWorkout}
            critique={latestCritique}
            isAnalyzing={isAnalyzingCritique}
            onClose={() => {
              setSummaryModalOpen(false);
              setCurrentTab('coach');
            }}
            onViewHistoryTab={() => {
              setSummaryModalOpen(false);
              setCurrentTab('history');
            }}
          />
        )}
      </div>
    </div>
  );
}
