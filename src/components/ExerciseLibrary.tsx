import React, { useState } from 'react';
import { Search, Plus, Dumbbell, Filter, Check, Sparkles } from 'lucide-react';
import { ExerciseTemplate, MuscleCategory } from '../types';
import { CATEGORIES } from '../data/defaultExercises';

interface ExerciseLibraryProps {
  exercises: ExerciseTemplate[];
  onAddCustomExercise: (newEx: Omit<ExerciseTemplate, 'id'>) => void;
  onSelectExerciseForWorkout?: (exercise: ExerciseTemplate) => void;
  isWorkoutActive?: boolean;
}

export const ExerciseLibrary: React.FC<ExerciseLibraryProps> = ({
  exercises,
  onAddCustomExercise,
  onSelectExerciseForWorkout,
  isWorkoutActive = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MuscleCategory | 'All'>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New exercise modal form state
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState<MuscleCategory>('Chest');
  const [customEquipment, setCustomEquipment] = useState<ExerciseTemplate['equipment']>('Barbell');
  const [customRest, setCustomRest] = useState<number>(90);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const filteredExercises = exercises.filter((ex) => {
    const matchesCategory = selectedCategory === 'All' || ex.category === selectedCategory;
    const matchesSearch =
      ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.equipment.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    onAddCustomExercise({
      name: customName.trim(),
      category: customCategory,
      equipment: customEquipment,
      defaultRestSeconds: Number(customRest) || 90,
      isCustom: true,
    });

    setCustomName('');
    setIsModalOpen(false);
    setFeedbackMsg(`Added "${customName.trim()}" to your library!`);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-emerald-400" />
            Exercise Library
          </h2>
          <p className="text-xs text-slate-400">
            {exercises.length} exercises across {CATEGORIES.length} muscle groups
          </p>
        </div>

        <button
          id="open-custom-exercise-modal-btn"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors shadow-lg shadow-emerald-500/10"
        >
          <Plus className="w-4 h-4" />
          <span>New</span>
        </button>
      </div>

      {feedbackMsg && (
        <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          id="exercise-search-input"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by exercise or equipment..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-emerald-500 focus:outline-none text-sm text-slate-100 placeholder-slate-500 transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200"
          >
            Clear
          </button>
        )}
      </div>

      {/* Category Pills (horizontal scrollable) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none -mx-1 px-1">
        <button
          id="category-pill-all"
          onClick={() => setSelectedCategory('All')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
            selectedCategory === 'All'
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
              : 'bg-slate-900/90 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          All ({exercises.length})
        </button>
        {CATEGORIES.map((cat) => {
          const count = exercises.filter((e) => e.category === cat).length;
          return (
            <button
              key={cat}
              id={`category-pill-${cat.toLowerCase()}`}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'bg-slate-900/90 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Exercise Cards List */}
      <div className="space-y-2">
        {filteredExercises.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-2xl bg-slate-900/50 border border-slate-800/80">
            <Filter className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-300 font-medium">No exercises found</p>
            <p className="text-xs text-slate-500 mt-1">Try another search or create a custom exercise</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-3 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-emerald-400 font-medium"
            >
              + Create Custom Exercise
            </button>
          </div>
        ) : (
          filteredExercises.map((ex) => (
            <div
              key={ex.id}
              id={`exercise-card-${ex.id}`}
              className="p-3 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition-colors flex items-center justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white truncate">{ex.name}</h3>
                  {ex.isCustom && (
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300">
                      Custom
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                  <span className="text-emerald-400/90 font-medium">{ex.category}</span>
                  <span>•</span>
                  <span>{ex.equipment}</span>
                  <span>•</span>
                  <span>{ex.defaultRestSeconds}s rest</span>
                </div>
              </div>

              {isWorkoutActive && onSelectExerciseForWorkout && (
                <button
                  id={`add-to-workout-btn-${ex.id}`}
                  onClick={() => onSelectExerciseForWorkout(ex)}
                  className="flex-shrink-0 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 hover:text-emerald-200 text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal: Create Custom Exercise */}
      {isModalOpen && (
        <div
          id="custom-exercise-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Add Custom Exercise
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustom} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Exercise Name *
                </label>
                <input
                  id="custom-exercise-name-input"
                  type="text"
                  required
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Pendlay Row, Deficit Deadlift"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Muscle Category
                  </label>
                  <select
                    id="custom-exercise-category-select"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value as MuscleCategory)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:border-emerald-500 focus:outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Equipment
                  </label>
                  <select
                    id="custom-exercise-equipment-select"
                    value={customEquipment}
                    onChange={(e) => setCustomEquipment(e.target.value as ExerciseTemplate['equipment'])}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="Barbell">Barbell</option>
                    <option value="Dumbbell">Dumbbell</option>
                    <option value="Cable">Cable</option>
                    <option value="Machine">Machine</option>
                    <option value="Bodyweight">Bodyweight</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Default Rest Timer (seconds)
                </label>
                <div className="flex items-center gap-2">
                  {[60, 90, 120, 180].map((sec) => (
                    <button
                      type="button"
                      key={sec}
                      onClick={() => setCustomRest(sec)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-medium ${
                        customRest === sec
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  id="save-custom-exercise-btn"
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20"
                >
                  Save Exercise
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
