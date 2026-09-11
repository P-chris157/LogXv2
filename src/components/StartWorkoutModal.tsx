import React, { useState, useEffect, useRef } from 'react';
import { Play, X, Dumbbell, Sparkles } from 'lucide-react';

interface StartWorkoutModalProps {
  isOpen: boolean;
  initialTitle: string;
  onConfirm: (title: string) => void;
  onCancel: () => void;
}

export const StartWorkoutModal: React.FC<StartWorkoutModalProps> = ({
  isOpen,
  initialTitle,
  onConfirm,
  onCancel,
}) => {
  const [title, setTitle] = useState(initialTitle || 'Freestyle workout');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle || 'Freestyle workout');
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [isOpen, initialTitle]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalTitle = title.trim() || initialTitle || 'Freestyle workout';
    onConfirm(finalTitle);
  };

  const presetSuggestions = [
    'Push Day',
    'Pull Day',
    'Leg Day',
    'Upper Body',
    'Lower Body',
    'Chest & Triceps',
    'Back & Biceps',
    'Full Body',
  ];

  return (
    <div
      id="start-workout-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
    >
      <div className="bg-[#141520] border border-[#26283b] rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4 my-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-theme-accent-bg border border-theme-border text-theme-light flex items-center justify-center">
              <Dumbbell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Name Your Workout</h3>
              <p className="text-xs text-slate-400">Optional — customize or keep default</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-xl text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Session Title
            </label>
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Upper Body Hypertrophy"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#191a27] border border-[#292b3d] text-sm font-semibold text-white placeholder-slate-500 focus:border-theme-accent focus:outline-none transition-colors"
            />
          </div>

          {/* Quick Preset Chips */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Quick Suggestions
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {presetSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setTitle(suggestion)}
                  className={`text-[11px] px-2.5 py-1 rounded-xl border transition-colors ${
                    title === suggestion
                      ? 'bg-theme-accent-bg border-theme-border text-white font-bold'
                      : 'bg-[#191a27] border-[#292b3d] text-slate-400 hover:text-white'
                  }`}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 px-4 rounded-xl bg-[#191a27] hover:bg-[#202234] border border-[#292b3d] text-slate-300 text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 rounded-xl btn-theme-primary font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
