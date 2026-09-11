import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Dumbbell,
  CheckCircle2,
  TrendingUp,
  Activity,
  Bot,
  User,
  ArrowRight,
  ShieldCheck,
  Zap,
  Loader2,
  Clock,
} from 'lucide-react';
import { CompletedWorkout, PrescribedNextWorkout, UserSettings } from '../types';
import { sendCoachChatMessage } from '../services/aiCoach';

interface AICoachTabProps {
  recentWorkout: CompletedWorkout | null;
  settings: UserSettings;
  onNavigateToWorkout: () => void;
  onNavigateToPlanWithRoutine?: (routineId: string) => void;
  onStartPrescribedFreestyle?: (prescription: PrescribedNextWorkout) => void;
  isAnalyzingCritique?: boolean;
  pendingWorkoutTitle?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  source?: 'gemini' | 'offline_engine';
}

export const AICoachTab: React.FC<AICoachTabProps> = ({
  recentWorkout,
  settings,
  onNavigateToWorkout,
  onNavigateToPlanWithRoutine,
  onStartPrescribedFreestyle,
  isAnalyzingCritique = false,
  pendingWorkoutTitle,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      content: recentWorkout
        ? `Welcome back! I've reviewed your latest workout "${recentWorkout.title || 'Workout'}". You moved ${(recentWorkout.totalVolume || 0).toLocaleString()} ${recentWorkout.unit || 'lbs'} across ${recentWorkout.completedSetsCount || 0} sets. Ask me anything about progressive overload, breaking plateaus, or your next training split!`
        : `Welcome to LogX AI Coach! I specialize in progressive overload mechanics, volume periodization, and exercise technique. Once you log workouts, I'll provide lift-by-lift weight/rep progression rules.`,
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Update welcome greeting if recentWorkout updates with newly finished workout
  useEffect(() => {
    if (recentWorkout && messages.length === 1 && messages[0].id === 'welcome') {
      setMessages([
        {
          id: 'welcome',
          role: 'model',
          content: `Welcome back! I've reviewed your latest workout "${recentWorkout.title || 'Workout'}". You moved ${(recentWorkout.totalVolume || 0).toLocaleString()} ${recentWorkout.unit || 'lbs'} across ${recentWorkout.completedSetsCount || 0} sets. Ask me anything about progressive overload, breaking plateaus, or your next training split!`,
        },
      ]);
    }
  }, [recentWorkout?.id]);

  const critique = recentWorkout?.critique;

  const quickPrompts = [
    'How do I break a bench press plateau?',
    'Should I add weight or reps next session?',
    'Prescribe my next workout split',
    'What should my warmup sets look like?',
  ];

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || isSending) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend.trim(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputQuery('');
    setIsSending(true);

    try {
      const response = await sendCoachChatMessage(
        newMessages.map((m) => ({ role: m.role, content: m.content })),
        settings.geminiApiKey,
        recentWorkout
          ? { workoutTitle: recentWorkout.title || 'Workout', totalVolume: recentWorkout.totalVolume || 0 }
          : undefined
      );

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'model',
          content: response.text,
          source: response.source,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'model',
          content:
            'For progressive overload: once you complete the upper bound of your rep target across all sets, increase load by 2.5% to 5% next session and rebuild your reps.',
          source: 'offline_engine',
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-4 pb-28 animate-fadeIn">
      {/* Top Header */}
      <div className="pt-1">
        <span className="text-[11px] font-bold uppercase tracking-widest text-theme-accent">
          INTELLIGENT PERFORMANCE
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-0.5">
          AI Strength Coach
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Progressive overload intelligence & custom split guidance
        </p>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span>Note: Deep workout analyses and overload calculations may take a few seconds to load.</span>
        </div>
      </div>

      {/* Processing Disclaimer Banner when newly completed workout is analyzing */}
      {isAnalyzingCritique && (
        <div
          id="coach-analyzing-disclaimer"
          className="rounded-3xl bg-amber-500/10 border border-amber-500/30 p-4 sm:p-5 shadow-xl space-y-2.5 animate-fadeIn"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-amber-400 animate-spin flex-shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Analyzing Your Latest Session: {pendingWorkoutTitle || 'Completed Workout'}
              </span>
            </div>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 flex-shrink-0 flex items-center gap-1">
              <Clock className="w-3 h-3 animate-spin" />
              ~5–10s
            </span>
          </div>

          <p className="text-xs text-slate-200 leading-relaxed">
            Please give your AI Coach a moment to process your completed sets, calculate double-progression milestones, and generate custom overload targets.
          </p>

          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 leading-relaxed">
            {critique ? (
              <span>
                <strong className="text-amber-300 font-semibold">Heads up:</strong> The breakdown displayed below is currently from your previous workout ({recentWorkout?.title || 'Prior Session'}). It will automatically refresh and update with your new session critique in just a few seconds!
              </span>
            ) : (
              <span>
                <strong className="text-amber-300 font-semibold">Heads up:</strong> Your workout breakdown, progressive overload targets, and next routine prescription will pop up right here once analysis completes.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Recent Workout Insights (if critique exists) */}
      {critique && (
        <div className="rounded-3xl bg-[#141520] border border-[#242638] p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-theme-light flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-theme-accent" />
              {isAnalyzingCritique ? 'Previous Session Analysis' : 'Recent Session Analysis'}
            </span>
            <div className="flex items-center gap-2">
              {isAnalyzingCritique && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                  Updating Soon
                </span>
              )}
              <span className="text-[10px] px-2 py-0.5 rounded-full badge-theme-accent font-bold">
                {critique.source === 'gemini' ? 'Gemini 2.5' : 'Offline Coach'}
              </span>
            </div>
          </div>

          <h3 className="text-base font-bold text-white leading-snug">{critique.headline}</h3>

          {/* What You Did Right / Highlights */}
          {((critique.whatYouDidRight && critique.whatYouDidRight.length > 0) ||
            (critique.highlights && critique.highlights.length > 0)) && (
            <div className="space-y-2 pt-1">
              <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider block">
                What You Did Right
              </span>
              <div className="space-y-1.5">
                {(critique.whatYouDidRight || critique.highlights || []).map((h, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl bg-[#191a27] border border-[#26283b] text-xs text-slate-300 flex items-start gap-2"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-theme-accent flex-shrink-0 mt-0.5" />
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Areas to Improve */}
          {critique.areasToImprove && critique.areasToImprove.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[#222436]">
              <span className="text-[11px] uppercase font-bold text-amber-400 tracking-wider block">
                Areas to Improve
              </span>
              <div className="space-y-1.5">
                {critique.areasToImprove.map((item, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl bg-[#191a27] border border-[#26283b] text-xs text-slate-300 flex items-start gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progressive Overload Next-Step Advice */}
          {critique.progressiveOverloadAdvice && critique.progressiveOverloadAdvice.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[#222436]">
              <span className="text-[11px] uppercase font-bold text-theme-light tracking-wider block">
                Lift-by-Lift Overload Targets
              </span>
              <div className="space-y-2">
                {critique.progressiveOverloadAdvice.map((po, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-[#191a27] border border-[#2d3045] space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{po.exerciseName}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          po.status === 'ready_to_increase'
                            ? 'badge-theme-accent'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {po.status === 'ready_to_increase' ? 'Graduated (+5 lbs)' : 'Build Reps'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{po.advice}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prescribed Next Split with Exercises */}
          {critique.prescribedNextWorkout && (
            <div className="p-4 rounded-2xl bg-[#191a27] border border-[#2d3045] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-theme-accent tracking-wider block">
                    {critique.prescribedNextWorkout.splitId === 'freestyle-custom' ||
                    (critique.prescribedNextWorkout.recommendedSplit || '').toLowerCase().includes('freestyle')
                      ? 'Prescribed Next Session · Freestyle Recovery'
                      : 'Prescribed Next Workout · 3-Day Cycle'}
                  </span>
                  <span className="text-sm font-bold text-white mt-0.5 block">
                    {critique.prescribedNextWorkout.recommendedSplit}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Target: {critique.prescribedNextWorkout.targetMuscleGroups.join(', ')} • {critique.prescribedNextWorkout.recoveryHours}h recovery
                  </span>
                </div>
                <button
                  id="coach-start-prescribed-btn"
                  onClick={() => {
                    const splitText = (critique?.prescribedNextWorkout?.recommendedSplit || '').toLowerCase();
                    const isFreestyle =
                      critique?.prescribedNextWorkout?.splitId === 'freestyle-custom' ||
                      splitText.includes('freestyle');

                    if (isFreestyle) {
                      if (onStartPrescribedFreestyle && critique.prescribedNextWorkout) {
                        onStartPrescribedFreestyle(critique.prescribedNextWorkout);
                      } else {
                        onNavigateToWorkout();
                      }
                      return;
                    }

                    let targetRoutineId = 'workout-a';
                    if (
                      splitText.includes('workout b') ||
                      splitText.includes('split b') ||
                      splitText.includes('routine b') ||
                      splitText.includes('deadlift') ||
                      splitText.includes('hinge')
                    ) {
                      targetRoutineId = 'workout-b';
                    } else if (
                      splitText.includes('workout c') ||
                      splitText.includes('split c') ||
                      splitText.includes('routine c') ||
                      splitText.includes('hypertrophy') ||
                      splitText.includes('unilateral')
                    ) {
                      targetRoutineId = 'workout-c';
                    } else if (
                      splitText.includes('workout a') ||
                      splitText.includes('split a') ||
                      splitText.includes('squat')
                    ) {
                      targetRoutineId = 'workout-a';
                    }

                    if (onNavigateToPlanWithRoutine) {
                      onNavigateToPlanWithRoutine(targetRoutineId);
                    } else {
                      onNavigateToWorkout();
                    }
                  }}
                  className="py-1.5 px-3 rounded-xl btn-theme-primary text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
                >
                  <span>Start</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {critique.prescribedNextWorkout.recoveryAdvice && (
                <p className="text-[11px] text-slate-400 italic bg-[#13141f] p-2.5 rounded-xl border border-[#222436]">
                  "{critique.prescribedNextWorkout.recoveryAdvice}"
                </p>
              )}

              {/* Next Workout Exercises Breakdown */}
              {critique.prescribedNextWorkout.exercises &&
                critique.prescribedNextWorkout.exercises.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Target Prescriptions & Rest
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {critique.prescribedNextWorkout.exercises.map((exPresc, pIdx) => (
                        <div
                          key={pIdx}
                          className="p-2.5 rounded-xl bg-[#141520] border border-[#26283b] space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white truncate max-w-[170px]">
                              {exPresc.exerciseName}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                              {exPresc.targetSets} sets
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span className="text-theme-light font-medium">{exPresc.targetReps}</span>
                            <span>{exPresc.restDuration || '90s rest'}</span>
                          </div>
                          {exPresc.targetWeight && exPresc.targetWeight !== 'Starting weight' && (
                            <div className="text-[10px] text-theme-accent font-semibold">
                              Target Load: {exPresc.targetWeight}
                            </div>
                          )}
                          {exPresc.doubleProgressionNote && (
                            <p className="text-[10px] text-slate-500 line-clamp-1">
                              {exPresc.doubleProgressionNote}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>
      )}

      {/* Interactive Coach Q&A Box */}
      <div className="rounded-3xl bg-[#141520] border border-[#242638] p-5 shadow-xl space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Bot className="w-4 h-4 text-theme-accent" />
          <span>Ask Your Coach</span>
        </h3>

        {/* Quick prompt chips */}
        <div className="flex flex-wrap gap-1.5">
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(prompt)}
              className="text-[11px] font-medium px-3 py-1.5 rounded-xl bg-[#191a27] hover:bg-[#222436] border border-[#26283b] text-slate-300 hover:text-white transition-colors text-left"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Chat message bubbles */}
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'model' && (
                <div className="w-7 h-7 rounded-xl bg-theme-accent-bg border border-theme-border text-theme-light flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              )}

              <div
                className={`p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'btn-theme-primary font-semibold shadow-sm'
                    : 'bg-[#191a27] border border-[#282a3d] text-slate-200'
                }`}
              >
                {msg.content}
              </div>

              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-[#1e2030] border border-[#2e324a] text-slate-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}

          {isSending && (
            <div className="flex gap-2.5 items-center text-xs text-theme-light animate-pulse">
              <div className="w-7 h-7 rounded-xl bg-theme-accent-bg border border-theme-border flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span>Formulating biomechanical advice...</span>
            </div>
          )}
        </div>

        {/* Message Input bar */}
        <div className="flex gap-2 pt-2 border-t border-[#222436]">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask coach a question..."
            className="flex-1 px-4 py-2.5 rounded-2xl bg-[#191a27] border border-[#282a3d] text-base sm:text-xs text-white placeholder-slate-500 focus:border-theme-accent focus:outline-none"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputQuery.trim() || isSending}
            className="p-2.5 rounded-2xl btn-theme-primary disabled:opacity-40 transition-colors shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
