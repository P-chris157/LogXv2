import React, { useState } from 'react';
import {
  Sparkles,
  Play,
  Dumbbell,
  Pencil,
  Check,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { TrainingRoutine, RoutineExerciseTarget, MuscleCategory } from '../types';
import { TRAINING_ROUTINES, getRoutineShortTitle } from '../data/trainingPlans';
import { DEFAULT_EXERCISES, CATEGORIES } from '../data/defaultExercises';
import { loadTrainingPlans, saveTrainingPlans } from '../services/storage';

interface PlanTabProps {
  onStartRoutine: (routine: TrainingRoutine) => void;
  selectedRoutineId?: string;
  onSelectRoutineId?: (id: string) => void;
}

export const PlanTab: React.FC<PlanTabProps> = ({
  onStartRoutine,
  selectedRoutineId: controlledRoutineId,
  onSelectRoutineId,
}) => {
  const [routinesList, setRoutinesList] = useState<TrainingRoutine[]>(() => loadTrainingPlans());
  const [internalSelectedRoutineId, setInternalSelectedRoutineId] = useState<string>(() => {
    const plans = loadTrainingPlans();
    return plans[0]?.id || 'workout-a';
  });

  const activeSelectedRoutineId =
    controlledRoutineId !== undefined ? controlledRoutineId : internalSelectedRoutineId;

  const handleSelectRoutine = (id: string) => {
    setInternalSelectedRoutineId(id);
    onSelectRoutineId?.(id);
  };

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isAddExerciseModalOpen, setIsAddExerciseModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const activeRoutineIndex = routinesList.findIndex((r) => r.id === activeSelectedRoutineId);
  const activeRoutine =
    (activeRoutineIndex >= 0 ? routinesList[activeRoutineIndex] : routinesList[0]) ||
    TRAINING_ROUTINES[0];

  const updateActiveRoutine = (updated: TrainingRoutine) => {
    const nextList = [...routinesList];
    const idx = nextList.findIndex((r) => r.id === updated.id);
    if (idx >= 0) {
      nextList[idx] = updated;
      setRoutinesList(nextList);
      saveTrainingPlans(nextList);
    }
  };

  const handleUpdateTitle = (newTitle: string) => {
    updateActiveRoutine({ ...activeRoutine, title: newTitle });
  };

  const handleUpdateDescription = (newDesc: string) => {
    updateActiveRoutine({ ...activeRoutine, description: newDesc });
  };

  const handleUpdateExerciseSets = (exerciseIndex: number, delta: number) => {
    const exercises = [...activeRoutine.exercises];
    const currentSets = exercises[exerciseIndex].targetSets || 3;
    const newSets = Math.max(1, Math.min(10, currentSets + delta));
    exercises[exerciseIndex] = { ...exercises[exerciseIndex], targetSets: newSets };
    updateActiveRoutine({ ...activeRoutine, exercises });
  };

  const handleUpdateExerciseReps = (exerciseIndex: number, newReps: string) => {
    const exercises = [...activeRoutine.exercises];
    exercises[exerciseIndex] = { ...exercises[exerciseIndex], targetReps: newReps };
    updateActiveRoutine({ ...activeRoutine, exercises });
  };

  const handleMoveExercise = (exerciseIndex: number, direction: 'up' | 'down') => {
    const exercises = [...activeRoutine.exercises];
    const targetIndex = direction === 'up' ? exerciseIndex - 1 : exerciseIndex + 1;
    if (targetIndex < 0 || targetIndex >= exercises.length) return;

    const [moved] = exercises.splice(exerciseIndex, 1);
    exercises.splice(targetIndex, 0, moved);
    updateActiveRoutine({ ...activeRoutine, exercises });
  };

  const handleRemoveExercise = (exerciseIndex: number) => {
    const exercises = activeRoutine.exercises.filter((_, idx) => idx !== exerciseIndex);
    updateActiveRoutine({ ...activeRoutine, exercises });
  };

  const handleAddExerciseToRoutine = (name: string, category: MuscleCategory, equipment: string) => {
    const newTarget: RoutineExerciseTarget = {
      name,
      category,
      equipment,
      targetSets: 3,
      targetReps: '8–12 reps',
      guidance: 'Log weights & reps with progressive overload',
    };
    updateActiveRoutine({
      ...activeRoutine,
      exercises: [...activeRoutine.exercises, newTarget],
    });
    setIsAddExerciseModalOpen(false);
  };

  const handleResetToDefault = () => {
    const defaultRoutine = TRAINING_ROUTINES.find((r) => r.id === activeRoutine.id);
    if (defaultRoutine) {
      updateActiveRoutine(JSON.parse(JSON.stringify(defaultRoutine)));
    }
  };

  // Filter exercises for Add Exercise Modal
  const filteredExercises = DEFAULT_EXERCISES.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'All' || ex.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-4 pb-28 animate-fadeIn">
      {/* Header */}
      <div className="pt-1 flex items-start justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-theme-accent">
            BUILT FOR CONSISTENCY
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-0.5">
            Your training plan
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Customizable full-body splits. Tailored to your progressive goals.
          </p>
        </div>

        {/* Edit Plan Toggle Button */}
        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
            isEditing
              ? 'btn-theme-primary shadow-sm'
              : 'bg-[#191a27] hover:bg-[#222436] border border-[#282a3d] text-slate-300 hover:text-white'
          }`}
        >
          {isEditing ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Done Editing</span>
            </>
          ) : (
            <>
              <Pencil className="w-3.5 h-3.5 text-theme-accent" />
              <span>Edit Plan</span>
            </>
          )}
        </button>
      </div>

      {/* Advisory Banner */}
      <div className="rounded-2xl bg-[#141520] border border-theme-border p-4 text-slate-300 text-xs leading-relaxed space-y-1 shadow-md">
        <p>
          {isEditing
            ? 'Customizing this split: Adjust sets, rep targets, reorder exercises, or add new exercises from the library. Changes save automatically.'
            : 'Your starting routine is a structured progressive framework. Review exercises and targets, choose manageable starting weights, and let LogX automatically adapt your progressive overload.'}
        </p>
      </div>

      {/* Segmented Routine Selector (Pills) */}
      <div className="flex rounded-2xl bg-[#141520] p-1.5 border border-[#242638] gap-1">
        {routinesList.map((routine) => {
          const isSelected = routine.id === activeSelectedRoutineId;
          const shortName = getRoutineShortTitle(routine);
          return (
            <button
              key={routine.id}
              onClick={() => handleSelectRoutine(routine.id)}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-center ${
                isSelected
                  ? 'bg-theme-accent-bg text-white border border-theme-border shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {shortName}
            </button>
          );
        })}
      </div>

      {/* Active Routine Card */}
      <div className="rounded-3xl bg-[#141520] border border-[#242638] p-5 shadow-xl space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <span className="text-[11px] font-bold uppercase tracking-widest text-theme-accent">
              SELECTED SPLIT
            </span>

            {isEditing ? (
              <div className="mt-1 space-y-2">
                <input
                  type="text"
                  value={activeRoutine.title}
                  onChange={(e) => handleUpdateTitle(e.target.value)}
                  placeholder="Routine Title"
                  className="w-full px-3 py-1.5 rounded-xl bg-[#191a27] border border-[#2d3045] text-sm font-bold text-white focus:border-theme-accent focus:outline-none"
                />
                <input
                  type="text"
                  value={activeRoutine.description}
                  onChange={(e) => handleUpdateDescription(e.target.value)}
                  placeholder="Description"
                  className="w-full px-3 py-1.5 rounded-xl bg-[#191a27] border border-[#2d3045] text-xs text-slate-300 focus:border-theme-accent focus:outline-none"
                />
              </div>
            ) : (
              <>
                <h3 className="text-xl font-black text-white tracking-tight mt-0.5">
                  {activeRoutine.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1">{activeRoutine.description}</p>
              </>
            )}
          </div>

          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <div className="px-3 py-1 rounded-full badge-theme-accent text-xs font-bold">
              {activeRoutine.exercises.length} {activeRoutine.exercises.length === 1 ? 'exercise' : 'exercises'}
            </div>
            {isEditing && (
              <button
                onClick={handleResetToDefault}
                className="text-[10px] text-slate-400 hover:text-red-400 flex items-center gap-1 transition-colors"
                title="Reset this routine to factory defaults"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Split</span>
              </button>
            )}
          </div>
        </div>

        {/* Exercises List inside Routine */}
        <div className="space-y-2.5 pt-2">
          {activeRoutine.exercises.map((target, idx) => (
            <div
              key={`${target.name}-${idx}`}
              className="p-3.5 rounded-2xl bg-[#191a27] border border-[#26283b] space-y-2.5 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-theme-accent-bg border border-theme-border text-theme-light text-xs font-bold flex items-center justify-center">
                    {(idx + 1).toString().padStart(2, '0')}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{target.name}</h4>
                    <span className="text-[11px] text-slate-400">{target.category}</span>
                  </div>
                </div>

                {isEditing ? (
                  <div className="flex items-center gap-1">
                    {/* Move Up */}
                    <button
                      onClick={() => handleMoveExercise(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 rounded-lg bg-[#222436] hover:bg-[#2d3045] disabled:opacity-20 text-slate-300 transition-colors"
                      title="Move up"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    {/* Move Down */}
                    <button
                      onClick={() => handleMoveExercise(idx, 'down')}
                      disabled={idx === activeRoutine.exercises.length - 1}
                      className="p-1.5 rounded-lg bg-[#222436] hover:bg-[#2d3045] disabled:opacity-20 text-slate-300 transition-colors"
                      title="Move down"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    {/* Delete */}
                    <button
                      onClick={() => handleRemoveExercise(idx)}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors ml-1"
                      title="Remove exercise from routine"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="text-right">
                    <div className="text-xs font-bold text-theme-light font-mono">
                      {target.targetSets} sets × {target.targetReps}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">Target: {target.targetSets} sets</div>
                  </div>
                )}
              </div>

              {/* In Edit mode: Target sets and rep range inputs */}
              {isEditing && (
                <div className="pt-2 border-t border-[#26283b] flex items-center justify-between text-xs gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[11px]">Sets:</span>
                    <div className="flex items-center gap-1 bg-[#141520] border border-[#2d3045] rounded-xl px-1.5 py-0.5">
                      <button
                        onClick={() => handleUpdateExerciseSets(idx, -1)}
                        className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white font-bold"
                      >
                        -
                      </button>
                      <span className="w-5 text-center font-mono font-bold text-white">
                        {target.targetSets}
                      </span>
                      <button
                        onClick={() => handleUpdateExerciseSets(idx, 1)}
                        className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-1 max-w-[180px]">
                    <span className="text-slate-400 text-[11px]">Reps:</span>
                    <input
                      type="text"
                      value={target.targetReps}
                      onChange={(e) => handleUpdateExerciseReps(idx, e.target.value)}
                      placeholder="e.g. 8–12 reps"
                      className="flex-1 px-2.5 py-1 rounded-xl bg-[#141520] border border-[#2d3045] text-xs font-mono text-theme-light focus:border-theme-accent focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add Exercise button in edit mode */}
          {isEditing && (
            <button
              onClick={() => setIsAddExerciseModalOpen(true)}
              className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-[#292d42] hover:border-theme-accent text-slate-400 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors mt-2"
            >
              <Plus className="w-4 h-4 text-theme-accent" />
              <span>Add Exercise to Split</span>
            </button>
          )}
        </div>

        {/* Start Routine Button */}
        <div className="pt-2">
          <button
            onClick={() => onStartRoutine(activeRoutine)}
            className="w-full py-3.5 px-4 rounded-2xl btn-theme-primary font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start {getRoutineShortTitle(activeRoutine)}</span>
          </button>
        </div>
      </div>

      {/* Add Exercise Modal */}
      {isAddExerciseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#141520] border border-[#26283b] rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-theme-accent" />
                <span>Add Exercise to {activeRoutine.title}</span>
              </h3>
              <button
                onClick={() => setIsAddExerciseModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search exercise..."
                className="w-full pl-9 pr-4 py-2 rounded-2xl bg-[#191a27] border border-[#292b3d] text-xs text-white placeholder-slate-500 focus:border-theme-accent focus:outline-none"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedCategory('All')}
                className={`text-[11px] px-3 py-1 rounded-xl whitespace-nowrap font-medium transition-colors ${
                  selectedCategory === 'All'
                    ? 'bg-theme-accent-bg border border-theme-border text-white font-bold'
                    : 'bg-[#191a27] text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-[11px] px-3 py-1 rounded-xl whitespace-nowrap font-medium transition-colors ${
                    selectedCategory === cat
                      ? 'bg-theme-accent-bg border border-theme-border text-white font-bold'
                      : 'bg-[#191a27] text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Exercise List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
              {filteredExercises.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  No exercises found matching "{searchQuery}"
                </div>
              ) : (
                filteredExercises.map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => handleAddExerciseToRoutine(ex.name, ex.category, ex.equipment)}
                    className="w-full p-3 rounded-2xl bg-[#191a27] hover:bg-[#222436] border border-[#26283b] text-left flex items-center justify-between transition-colors group"
                  >
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-theme-light">
                        {ex.name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {ex.category} • {ex.equipment}
                      </div>
                    </div>
                    <Plus className="w-4 h-4 text-theme-accent opacity-70 group-hover:opacity-100" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
