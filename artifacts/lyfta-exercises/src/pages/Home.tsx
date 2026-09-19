import { useState, useMemo } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Filters } from "@/components/exercises/Filters";
import { ExerciseCard } from "@/components/exercises/ExerciseCard";
import { ExerciseDetailModal } from "@/components/exercises/ExerciseDetailModal";
import { ExerciseFormModal } from "@/components/exercises/ExerciseFormModal";
import { useListExercises, useGetExerciseFilters } from "@/hooks/use-exercises";
import { useDebounce } from "@/hooks/use-debounce"; // Will implement inline
import { Loader2, ChevronLeft, ChevronRight, Activity } from "lucide-react";
import type { Exercise } from "@workspace/api-client-react";
import { motion } from "framer-motion";

// Simple debounce hook implementation inline
function useDebounceValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useMemo(() => {
    const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function Home() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounceValue(search, 300);
  const [bodyPart, setBodyPart] = useState("");
  const [equipment, setEquipment] = useState("");
  const [page, setPage] = useState(1);

  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [exerciseToEdit, setExerciseToEdit] = useState<Exercise | null>(null);

  const { data: filtersData } = useGetExerciseFilters();
  
  const { data: exercisesData, isLoading, isError } = useListExercises({
    search: debouncedSearch,
    bodyPart,
    equipment,
    page,
    limit: 24
  });

  const bodyParts = filtersData?.bodyParts || [
    "back", "cardio", "chest", "lower arms", "lower legs", 
    "neck", "shoulders", "upper arms", "upper legs", "waist"
  ];
  
  const equipments = filtersData?.equipment || [
    "assisted", "band", "barbell", "body weight", "cable", 
    "dumbbell", "ez barbell", "kettlebell", "leverage machine", 
    "medicine ball", "resistance band", "smith machine", "stability ball"
  ];

  const handleEdit = (ex: Exercise) => {
    setSelectedExercise(null);
    setExerciseToEdit(ex);
    setFormModalOpen(true);
  };

  const handleCreate = () => {
    setExerciseToEdit(null);
    setFormModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <img 
          src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
          alt="Atmosphere" 
          className="w-full h-full object-cover opacity-20 mix-blend-overlay"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/90 to-background" />
      </div>

      <div className="relative z-10 flex flex-col flex-1">
        <Navbar onAddClick={handleCreate} />
        
        <Filters 
          search={search} setSearch={(v) => { setSearch(v); setPage(1); }}
          selectedBodyPart={bodyPart} setSelectedBodyPart={(v) => { setBodyPart(v); setPage(1); }}
          selectedEquipment={equipment} setSelectedEquipment={(v) => { setEquipment(v); setPage(1); }}
          bodyParts={bodyParts}
          equipment={equipments}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl md:text-3xl font-display font-bold">
              <span className="text-gradient">Exercise</span> Library
            </h1>
            {!isLoading && exercisesData && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm font-medium text-white/70">
                <Activity className="w-4 h-4 text-primary" />
                {exercisesData.total} results
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="bg-card rounded-2xl border border-white/5 aspect-[4/5] animate-pulse relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-20 bg-card rounded-2xl border border-white/5">
              <p className="text-destructive font-medium text-lg">Failed to load exercises.</p>
              <p className="text-muted-foreground mt-2">The API endpoint might be missing.</p>
            </div>
          ) : exercisesData?.exercises.length === 0 ? (
            <div className="text-center py-32 bg-card rounded-3xl border border-white/5 flex flex-col items-center">
              <Dumbbell className="w-16 h-16 text-white/10 mb-4" />
              <h3 className="text-xl font-display font-bold text-white mb-2">No exercises found</h3>
              <p className="text-white/50 max-w-md mx-auto">Try adjusting your filters or searching for something else.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {exercisesData?.exercises.map((exercise, idx) => (
                  <ExerciseCard 
                    key={exercise.id} 
                    exercise={exercise} 
                    index={idx}
                    onClick={setSelectedExercise}
                  />
                ))}
              </div>

              {/* Pagination */}
              {exercisesData && exercisesData.totalPages > 1 && (
                <div className="mt-12 flex items-center justify-center gap-4">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-3 rounded-xl bg-card border border-white/10 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-white"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="font-medium text-white/70">
                    Page <span className="text-white">{page}</span> of {exercisesData.totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(exercisesData.totalPages, p + 1))}
                    disabled={page === exercisesData.totalPages}
                    className="p-3 rounded-xl bg-card border border-white/10 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-white"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <ExerciseDetailModal 
        exercise={selectedExercise} 
        onClose={() => setSelectedExercise(null)} 
        onEdit={handleEdit}
      />

      <ExerciseFormModal 
        isOpen={formModalOpen} 
        onClose={() => setFormModalOpen(false)} 
        exerciseToEdit={exerciseToEdit}
      />
    </div>
  );
}
