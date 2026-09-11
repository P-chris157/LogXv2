import React from 'react';
import {
  Calendar,
  Play,
  ArrowRight,
  Sparkles,
  Dumbbell,
  CheckCircle2,
  Clock,
  Flame,
  FlameKindling,
  SlidersHorizontal,
} from 'lucide-react';
import { CompletedWorkout, TrainingRoutine } from '../types';
import { determineNextRoutine } from '../services/doubleProgression';
import { loadTrainingPlans } from '../services/storage';
import { getRoutineShortTitle } from '../data/trainingPlans';

interface HomeTabProps {
  onStartFreestyle: () => void;
  onViewRoutine: () => void;
  onStartRoutine?: (routine: TrainingRoutine) => void;
  onNavigateToWorkout: () => void;
  isWorkoutActive: boolean;
  activeExercisesCount: number;
  activeSetsCount: number;
  workouts: CompletedWorkout[];
  onOpenSettings?: () => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  onStartFreestyle,
  onViewRoutine,
  onStartRoutine,
  onNavigateToWorkout,
  isWorkoutActive,
  activeExercisesCount,
  activeSetsCount,
  workouts,
}) => {
  const now = new Date();
  const routines = loadTrainingPlans();
  // Find the latest completed routine in the 3-day split, or fall back to the first routine
  const latestStructuredWorkout = workouts.find((w) => {
    const t = (w?.title || '').toLowerCase();
    return t.includes('workout a') || t.includes('workout b') || t.includes('workout c');
  });
  const nextRoutine =
    determineNextRoutine(latestStructuredWorkout, routines) ||
    routines[0] ||
    null;
  const nextRoutineShort = getRoutineShortTitle(nextRoutine);

  // Get start of the current week (Monday)
  const currentDayOfWeek = (now.getDay() + 6) % 7; // Monday = 0, Sunday = 6
  const monday = new Date(now);
  monday.setDate(now.getDate() - currentDayOfWeek);
  monday.setHours(0, 0, 0, 0);

  // 7 days of this week: Monday to Sunday
  const daysOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((dayLabel, index) => {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + index);

    const isToday =
      dayDate.getDate() === now.getDate() &&
      dayDate.getMonth() === now.getMonth() &&
      dayDate.getFullYear() === now.getFullYear();

    const startOfDay = new Date(dayDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dayDate);
    endOfDay.setHours(23, 59, 59, 999);

    const hasWorkout = workouts.some(
      (w) => w.endTime >= startOfDay.getTime() && w.endTime <= endOfDay.getTime()
    );

    return {
      label: dayLabel,
      dateNum: dayDate.getDate(),
      isToday,
      hasWorkout,
    };
  });

  // When an active workout is in progress, show ONLY the "Pick up right where you left off" view
  if (isWorkoutActive) {
    return (
      <div className="space-y-4 pb-28 animate-fadeIn">
        {/* Top Header Section */}
        <div className="pt-1">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-theme-accent">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-theme-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-theme-accent"></span>
            </span>
            <span>ACTIVE WORKOUT IN PROGRESS</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
            Pick up right where you left off
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Your live training session is active. Every set, weight, and rest countdown is tracked.
          </p>
        </div>

        {/* Focused Hero Resume Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#181528] to-[#12131e] border border-theme-border p-6 shadow-2xl space-y-5">
          {/* Subtle Background Graphic */}
          <div
            className="absolute -right-6 -bottom-6 w-48 h-48 rounded-full blur-2xl pointer-events-none opacity-25"
            style={{ backgroundColor: 'var(--theme-accent)' }}
          />
          <div className="absolute right-4 top-4 text-white/[0.03] font-black text-8xl select-none pointer-events-none">
            X
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-theme-light uppercase tracking-wide">
              <Dumbbell className="w-4 h-4" />
              <span>LIVE GYM SESSION</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-theme-accent-bg border border-theme-border text-theme-light text-xs font-bold font-mono">
              In Progress
            </span>
          </div>

          <div>
            <h3 className="text-2xl font-black text-white tracking-tight">
              Active Workout in Progress
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
              Currently logging <strong>{activeExercisesCount} {activeExercisesCount === 1 ? 'exercise' : 'exercises'}</strong> ({activeSetsCount} sets completed). Pick up right where you left off.
            </p>
          </div>

          <button
            id="resume-workout-btn"
            onClick={onNavigateToWorkout}
            className="w-full py-4 px-5 rounded-2xl btn-theme-primary font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Resume Workout</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-28 animate-fadeIn">
      {/* Top Header Section */}
      <div className="flex items-start justify-between pt-1">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-theme-accent">
            YOUR TRAINING, IN FOCUS
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-0.5">
            Make every rep count.
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            A little stronger. One session at a time.
          </p>
        </div>

        <button
          onClick={onViewRoutine}
          className="p-2.5 rounded-xl bg-[#171824] hover:bg-[#202234] border border-[#27293d] text-slate-300 hover:text-white transition-colors"
          title="Training Routines"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Hero Card: Freestyle Workout */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#181528] to-[#12131e] border border-theme-border p-5 shadow-2xl space-y-4">
        {/* Subtle Background Graphic */}
        <div
          className="absolute -right-6 -bottom-6 w-48 h-48 rounded-full blur-2xl pointer-events-none opacity-20"
          style={{ backgroundColor: 'var(--theme-accent)' }}
        />
        <div className="absolute right-4 top-4 text-white/[0.03] font-black text-8xl select-none pointer-events-none">
          X
        </div>

        {/* Eyebrow badge */}
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-theme-light tracking-wide uppercase">
          <Dumbbell className="w-3.5 h-3.5" />
          <span>YOUR WORKOUT, YOUR WAY</span>
        </div>

        {/* Card Titles */}
        <div>
          <h3 className="text-2xl font-black text-white tracking-tight">
            {isWorkoutActive ? 'Active Workout in Progress' : 'Freestyle workout'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
            {isWorkoutActive
              ? `Currently logging ${activeExercisesCount} ${activeExercisesCount === 1 ? 'exercise' : 'exercises'} (${activeSetsCount} sets). Pick up right where you left off.`
              : 'Pick your own exercises on the fly or load up pre-set routines. Every set is saved and adapted.'}
          </p>
        </div>

        {/* Action Button */}
        <div>
          {isWorkoutActive ? (
            <button
              id="resume-workout-btn"
              onClick={onNavigateToWorkout}
              className="w-full py-3.5 px-4 rounded-2xl btn-theme-primary font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Resume workout</span>
            </button>
          ) : (
            <button
              id="start-freestyle-btn"
              onClick={onStartFreestyle}
              className="w-full py-3.5 px-4 rounded-2xl btn-theme-primary font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start workout</span>
            </button>
          )}
        </div>
      </div>

      {/* Routine Recommendation Card (Screenshot 2) */}
      <div className="rounded-3xl bg-[#141520] border border-[#242638] p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            NEXT UP IN ROUTINE
          </span>
          <span className="text-[11px] font-semibold text-theme-light flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-theme-accent" />
            3-Day Split
          </span>
        </div>

        <div>
          <h4 className="text-lg font-bold text-white tracking-tight">
            {nextRoutine?.title || 'Workout A: Squat & Horizontal Push/Pull'}
          </h4>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            {nextRoutine?.description || 'Primary squat foundation with barbell compound strength.'}
          </p>
        </div>

        <div className="flex gap-2.5">
          <button
            id="routine-view-btn"
            onClick={onViewRoutine}
            className="flex-1 py-3 px-3 rounded-2xl bg-[#1c1e2e] hover:bg-[#25283d] border border-[#2a2d42] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
          >
            <span>View split</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            id="routine-start-btn"
            onClick={() => {
              if (onStartRoutine && nextRoutine) {
                onStartRoutine(nextRoutine);
              } else {
                onViewRoutine();
              }
            }}
            className="flex-1 py-3 px-3 rounded-2xl btn-theme-primary font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md"
          >
            <span>Start {nextRoutineShort}</span>
          </button>
        </div>
      </div>

      {/* Weekly Progress Tracker (Screenshot 2) */}
      <div className="rounded-3xl bg-[#141520] border border-[#242638] p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            THIS WEEK'S MOMENTUM
          </span>
          <span className="text-xs text-slate-400 font-medium">
            {workouts.filter((w) => w.endTime >= monday.getTime()).length} sessions
          </span>
        </div>

        {/* Days Row: M, T, W, T, F, S, S */}
        <div className="grid grid-cols-7 gap-1.5 pt-1">
          {daysOfWeek.map((day, idx) => {
            return (
              <div key={idx} className="flex flex-col items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-500">{day.label}</span>
                <div
                  className={`w-9 h-10 rounded-2xl flex flex-col items-center justify-center transition-all ${
                    day.hasWorkout
                      ? 'btn-theme-primary font-bold shadow-md'
                      : day.isToday
                      ? 'bg-theme-accent-bg text-theme-light border border-theme-border font-bold'
                      : 'bg-[#191a27] text-slate-400 border border-[#26283b]'
                  }`}
                >
                  <span className="text-xs">{day.dateNum}</span>
                  {day.hasWorkout && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0d0a18] mt-0.5" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent History Preview (Screenshot 2) */}
      <div className="rounded-3xl bg-[#141520] border border-[#242638] p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            RECENT WORKOUTS
          </span>
          <span className="text-xs text-slate-500 font-medium">
            {workouts.length} total logged
          </span>
        </div>

        {workouts.length === 0 ? (
          <div className="py-6 text-center text-slate-500 text-xs">
            No completed workouts yet. Hit "Start workout" to begin your streak.
          </div>
        ) : (
          <div className="space-y-2">
            {workouts.slice(0, 2).map((w) => (
              <div
                key={w.id}
                className="p-3 rounded-2xl bg-[#191a27] border border-[#26283b] flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-white">{w.title}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {new Date(w.endTime).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    • {w.durationFormatted}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-theme-light">
                    {w.totalVolume.toLocaleString()} {w.unit}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {w.completedSetsCount} sets
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
