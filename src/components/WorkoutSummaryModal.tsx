import React, { useState } from 'react';
import {
  Trophy,
  CheckCircle2,
  Clock,
  Flame,
  Share2,
  Sparkles,
  ArrowUpRight,
  Dumbbell,
  Check,
  ChevronRight,
  X,
  Copy,
} from 'lucide-react';
import { AICritique, CompletedWorkout } from '../types';
import { formatWorkoutForAI, copyToClipboard } from '../services/storage';

interface WorkoutSummaryModalProps {
  workout: CompletedWorkout | null;
  critique: AICritique | null;
  isAnalyzing: boolean;
  onClose: () => void;
  onViewHistoryTab: () => void;
}

export const WorkoutSummaryModal: React.FC<WorkoutSummaryModalProps> = ({
  workout,
  critique,
  isAnalyzing,
  onClose,
  onViewHistoryTab,
}) => {
  const [copied, setCopied] = useState(false);

  if (!workout) return null;

  const handleCopyForAI = async () => {
    const text = formatWorkoutForAI(workout);
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div
      id="workout-summary-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md overflow-y-auto animate-fadeIn"
    >
      <div className="bg-[#141520] border border-[#282a3d] rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4 my-auto">
        {/* Header Ribbon */}
        <div className="text-center space-y-1 relative">
          <button
            onClick={onClose}
            className="absolute -top-1 -right-1 p-1 rounded-xl text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-12 h-12 mx-auto rounded-2xl bg-theme-accent-bg border border-theme-border flex items-center justify-center text-theme-light shadow-lg">
            <Trophy className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black tracking-tight text-white mt-2">Workout Complete!</h2>
          <p className="text-xs text-slate-400">{workout?.title || 'Workout'}</p>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-2 p-3.5 rounded-2xl bg-[#191a27] border border-[#292b3d] text-center">
          <div>
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">
              Duration
            </span>
            <span className="font-mono text-sm font-bold text-white mt-0.5 block">
              {workout.durationFormatted}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">
              Volume
            </span>
            <span className="font-mono text-sm font-bold text-theme-light truncate mt-0.5 block">
              {workout.totalVolume.toLocaleString()}{' '}
              <span className="text-[10px] text-slate-400">{workout.unit}</span>
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">Sets</span>
            <span className="font-mono text-sm font-bold text-white mt-0.5 block">
              {workout.completedSetsCount}
            </span>
          </div>
        </div>

        {/* AI Performance Evaluation */}
        <div className="p-3.5 rounded-2xl bg-theme-accent-bg border border-theme-border space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-theme-light">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Strength Analysis</span>
            </div>
            {isAnalyzing ? (
              <span className="text-[10px] text-slate-400 font-mono animate-pulse">
                Evaluating...
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full badge-theme-accent font-bold">
                {critique?.source === 'gemini' ? 'Gemini 2.5' : 'Offline Coach'}
              </span>
            )}
          </div>

          {isAnalyzing ? (
            <div className="py-2 space-y-1.5 text-center">
              <div className="w-5 h-5 border-2 border-theme-accent border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-[11px] text-slate-400">Computing progressive overload rules...</p>
            </div>
          ) : critique ? (
            <div className="space-y-2 text-xs">
              <p className="text-white font-semibold leading-snug">{critique.headline}</p>
              {(critique.whatYouDidRight || critique.highlights) && (
                <ul className="text-[11px] text-slate-300 space-y-1">
                  {(critique.whatYouDidRight || critique.highlights || []).slice(0, 2).map((h, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <Check className="w-3 h-3 text-theme-accent flex-shrink-0 mt-0.5" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              )}
              {critique.prescribedNextWorkout && (
                <div className="pt-1.5 mt-1 border-t border-theme-border/50 text-[11px]">
                  <span className="text-[10px] font-bold uppercase text-theme-accent block">
                    Next Prescribed Session:
                  </span>
                  <span className="font-semibold text-white">
                    {critique.prescribedNextWorkout.recommendedSplit}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-300">
              Outstanding consistency! Keep progressive overload steady on your next session.
            </p>
          )}
        </div>

        {/* Exercises Summary Pill row */}
        <div className="flex flex-wrap gap-1.5">
          {workout.exercises.map((ex, i) => (
            <span
              key={i}
              className="text-[10px] px-2.5 py-1 rounded-xl bg-[#191a27] border border-[#282a3d] text-slate-300 font-medium"
            >
              {ex.name} ({ex.sets.filter((s) => s.completed).length} sets)
            </span>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl btn-theme-primary font-black text-xs uppercase tracking-wider transition-all shadow-lg"
          >
            Done & Save
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleCopyForAI}
              className="py-2.5 px-3 rounded-2xl bg-[#191a27] hover:bg-[#222436] border border-[#292b3d] text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              title="Copy title, date, and exercise sets strictly for external AI"
            >
              {copied ? (
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
              onClick={onViewHistoryTab}
              className="py-2.5 px-3 rounded-2xl bg-[#191a27] hover:bg-[#222436] border border-[#292b3d] text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
            >
              <span>History</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
