import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Flame,
  Share2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Check,
  Dumbbell,
  ArrowUpRight,
  Copy,
} from 'lucide-react';
import { CompletedWorkout } from '../types';
import { formatWorkoutForAI, copyToClipboard } from '../services/storage';

interface HistoryTabProps {
  workouts: CompletedWorkout[];
  onDeleteWorkout: (id: string) => void;
  onStartNewWorkout: () => void;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  workouts,
  onDeleteWorkout,
  onStartNewWorkout,
}) => {
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(
    workouts.length > 0 ? workouts[0].id : null
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyForAI = async (w: CompletedWorkout) => {
    const text = formatWorkoutForAI(w);
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedId(w.id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedWorkoutId(expandedWorkoutId === id ? null : id);
  };

  const totalAllTimeVolume = workouts.reduce((sum, w) => sum + (w.totalVolume || 0), 0);
  const totalAllTimeSets = workouts.reduce((sum, w) => sum + (w.completedSetsCount || 0), 0);

  return (
    <div className="space-y-4 pb-28 animate-fadeIn">
      {/* Top Header */}
      <div className="flex items-start justify-between pt-1">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-theme-accent">
            PAST LOGS & RECOVERY
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-0.5">
            Workout History
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {workouts.length} recorded session{workouts.length === 1 ? '' : 's'}
          </p>
        </div>

        {workouts.length > 0 && (
          <button
            onClick={onStartNewWorkout}
            className="py-2 px-3.5 rounded-xl bg-theme-accent-bg hover:opacity-90 border border-theme-border text-theme-light text-xs font-bold transition-all shadow-sm"
          >
            + New Session
          </button>
        )}
      </div>

      {/* Aggregate Stats Summary Card */}
      {workouts.length > 0 && (
        <div className="grid grid-cols-3 gap-2 p-4 rounded-3xl bg-[#141520] border border-[#242638] shadow-xl text-center">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              WORKOUTS
            </span>
            <span className="text-lg font-black text-white mt-0.5 block">{workouts.length}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              TOTAL SETS
            </span>
            <span className="text-lg font-black text-white mt-0.5 block">{totalAllTimeSets}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              LIFETIME VOL
            </span>
            <span className="text-lg font-black text-theme-light font-mono truncate mt-0.5 block">
              {totalAllTimeVolume >= 10000
                ? `${(totalAllTimeVolume / 1000).toFixed(1)}k`
                : totalAllTimeVolume}
            </span>
          </div>
        </div>
      )}

      {/* Workouts History List */}
      {workouts.length === 0 ? (
        <div className="py-16 text-center rounded-3xl bg-[#141520] border border-dashed border-[#242638] p-6 space-y-3">
          <Calendar className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm font-bold text-slate-300">No workout records found</p>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Complete your first session from the Home or Workout tab to generate historic logs.
          </p>
          <button
            onClick={onStartNewWorkout}
            className="py-2.5 px-5 rounded-2xl btn-theme-primary font-bold text-xs shadow-lg"
          >
            Start First Session
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {workouts.map((workout) => {
            const isExpanded = expandedWorkoutId === workout.id;
            const dateObj = new Date(workout.endTime);
            const dateFormatted = dateObj.toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const timeFormatted = dateObj.toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={workout.id}
                id={`history-workout-${workout.id}`}
                className="rounded-3xl bg-[#141520] border border-[#242638] overflow-hidden shadow-xl transition-all"
              >
                {/* Header item (Click to toggle expand) */}
                <div
                  onClick={() => toggleExpand(workout.id)}
                  className="p-4 cursor-pointer hover:bg-[#181926] transition-colors flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white tracking-tight">
                        {workout?.title || 'Workout'}
                      </h3>
                      {workout.critique && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full badge-theme-accent font-bold flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>AI Feedback</span>
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-2">
                      <span>{dateFormatted}</span>
                      <span>•</span>
                      <span>{timeFormatted}</span>
                      <span>•</span>
                      <span>{workout.durationFormatted}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-bold text-theme-light font-mono">
                        {workout.totalVolume.toLocaleString()} {workout.unit}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {workout.completedSetsCount} sets
                      </div>
                    </div>
                    <div className="text-slate-400">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-[#222436] space-y-3 bg-[#11121c]">
                    {/* AI Coach Critique summary banner if present */}
                    {workout.critique && (
                      <div className="p-3.5 rounded-2xl bg-theme-accent-bg border border-theme-border space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold text-theme-light">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>AI Performance Critique</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {workout.critique.source === 'gemini' ? 'Gemini 2.5' : 'Offline Rule'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-200 font-medium leading-relaxed">
                          {workout.critique.headline}
                        </p>
                        {workout.critique.highlights && (
                          <div className="text-[11px] text-slate-300 space-y-0.5 pt-1">
                            {workout.critique.highlights.map((h, i) => (
                              <div key={i} className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-theme-accent" />
                                <span>{h}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Exercises logged in this workout */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        EXERCISE BREAKDOWN
                      </span>
                      {workout.exercises.map((ex, i) => {
                        const completedSets = ex.sets.filter((s) => s.completed);
                        return (
                          <div
                            key={i}
                            className="p-3 rounded-2xl bg-[#171825] border border-[#26283b] space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white">{ex.name}</span>
                              <span className="text-[11px] text-slate-400">
                                {completedSets.length} sets logged
                              </span>
                            </div>

                            {/* Sets pill grid */}
                            <div className="flex flex-wrap gap-1.5">
                              {ex.sets.map((set, sIdx) => {
                                if (!set.completed) return null;
                                return (
                                  <div
                                    key={sIdx}
                                    className="px-2.5 py-1 rounded-xl bg-[#1d1f30] border border-[#2e3148] text-xs font-mono text-slate-300 flex items-center gap-1"
                                  >
                                    <span className="text-slate-500 font-sans text-[10px]">
                                      S{set.setNumber}:
                                    </span>
                                    <span className="font-bold text-white">{set.weight}</span>
                                    <span className="text-[10px] text-slate-400">
                                      {workout.unit}
                                    </span>
                                    <span className="text-slate-500 font-sans text-[10px]">×</span>
                                    <span className="font-bold text-theme-light">{set.reps}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Footer Actions: Share & Delete */}
                    <div className="flex items-center justify-between pt-2">
                      <button
                        onClick={() => handleCopyForAI(workout)}
                        className="py-2 px-3.5 rounded-xl bg-[#1a1b2a] hover:bg-[#23253a] border border-[#2b2e45] text-xs font-bold text-slate-300 flex items-center gap-1.5 transition-colors"
                        title="Copy title, date, and exercise sets strictly for external AI"
                      >
                        {copiedId === workout.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-theme-accent" />
                            <span className="text-theme-accent">Copied for AI!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-theme-accent" />
                            <span>Copy for AI</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => onDeleteWorkout(workout.id)}
                        className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
