import React, { useState, useEffect } from 'react';
import { Play, Pause, X, RotateCcw, Plus, BellRing, ChevronUp, ChevronDown } from 'lucide-react';
import { soundService } from '../services/sound';

interface RestTimerProps {
  initialSeconds: number;
  isActive: boolean;
  onDismiss: () => void;
  soundEnabled: boolean;
}

export const RestTimer: React.FC<RestTimerProps> = ({
  initialSeconds,
  isActive,
  onDismiss,
  soundEnabled,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(initialSeconds);
  const [totalSeconds, setTotalSeconds] = useState<number>(initialSeconds);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  useEffect(() => {
    setSecondsRemaining(initialSeconds);
    setTotalSeconds(initialSeconds);
    setIsPaused(false);
  }, [initialSeconds]);

  useEffect(() => {
    if (!isActive || isPaused || secondsRemaining <= 0) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (soundEnabled) {
            soundService.playRestFinishedBeep();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, isPaused, secondsRemaining, soundEnabled]);

  if (!isActive) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;
  const progressPercent =
    totalSeconds > 0 ? ((totalSeconds - secondsRemaining) / totalSeconds) * 100 : 100;
  const isFinished = secondsRemaining === 0;

  const addTime = (secs: number) => {
    setSecondsRemaining((prev) => prev + secs);
    setTotalSeconds((prev) => Math.max(prev, secondsRemaining + secs));
    if (isPaused) setIsPaused(false);
  };

  const handleReset = () => {
    setSecondsRemaining(totalSeconds);
    setIsPaused(false);
  };

  return (
    <div
      id="floating-rest-timer"
      className="fixed bottom-20 left-4 right-4 max-w-[400px] mx-auto z-30 transition-all duration-200"
    >
      <div
        className={`rounded-3xl border backdrop-blur-xl shadow-2xl transition-all duration-200 ${
          isFinished
            ? 'bg-[#221636] border-[#b49bf8] shadow-purple-900/50 animate-pulse'
            : 'bg-[#141520]/95 border-[#3b2c60] shadow-black/80'
        } p-4`}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              {!isFinished && !isPaused && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#c084fc] opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  isFinished ? 'bg-[#b49bf8]' : isPaused ? 'bg-amber-400' : 'bg-[#c084fc]'
                }`}
              ></span>
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#c084fc]">
              {isFinished ? 'Rest Over - Next Set!' : isPaused ? 'Rest Paused' : 'Rest Timer'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              id="rest-timer-toggle-expand"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
            <button
              id="rest-timer-close-btn"
              onClick={onDismiss}
              className="text-slate-400 hover:text-rose-400 p-1 rounded-lg"
              title="Close Timer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Timer Display & Main Controls */}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span
              id="rest-timer-countdown"
              className={`font-mono text-3xl font-black tracking-tight ${
                isFinished ? 'text-[#c084fc]' : 'text-white'
              }`}
            >
              {formattedTime}
            </span>
            {isFinished && (
              <span className="text-xs text-[#c084fc] flex items-center gap-1 font-bold">
                <BellRing className="w-3.5 h-3.5 animate-bounce" /> Get to work!
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              id="rest-timer-reset-btn"
              onClick={handleReset}
              className="p-2 rounded-xl bg-[#191a27] hover:bg-[#202234] border border-[#2a2d40] text-slate-300 hover:text-white transition-colors"
              title="Reset Timer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            {!isFinished && (
              <button
                id="rest-timer-play-pause-btn"
                onClick={() => setIsPaused(!isPaused)}
                className={`p-2 rounded-xl font-medium transition-colors ${
                  isPaused
                    ? 'bg-[#b49bf8] hover:bg-[#c4adff] text-[#0d0a18] font-bold'
                    : 'bg-[#191a27] hover:bg-[#202234] border border-[#2a2d40] text-slate-300 hover:text-white'
                }`}
                title={isPaused ? 'Resume' : 'Pause'}
              >
                {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-2.5 w-full bg-[#191a27] h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ease-linear rounded-full ${
              isFinished ? 'bg-[#b49bf8]' : 'bg-[#b49bf8]'
            }`}
            style={{ width: `${Math.min(100, progressPercent)}%` }}
          />
        </div>

        {/* Quick adjustments bar when expanded */}
        {isExpanded && (
          <div className="mt-3 pt-2.5 border-t border-[#222436] flex items-center justify-between gap-1.5">
            <span className="text-[11px] text-slate-400 font-medium">Quick add:</span>
            <div className="flex items-center gap-1">
              {[15, 30, 60, 90].map((secs) => (
                <button
                  key={secs}
                  id={`rest-timer-add-${secs}s`}
                  onClick={() => addTime(secs)}
                  className="px-2 py-1 rounded-xl bg-[#191a27] hover:bg-[#202234] border border-[#282a3d] text-xs font-mono font-medium text-slate-300 hover:text-[#c084fc] transition-colors flex items-center gap-0.5"
                >
                  <Plus className="w-2.5 h-2.5" />
                  {secs}s
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
