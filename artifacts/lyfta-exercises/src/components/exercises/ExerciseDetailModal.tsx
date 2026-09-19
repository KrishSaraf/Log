import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Target, Dumbbell, Activity, ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";
import type { Exercise } from "@workspace/api-client-react";

interface Props {
  exercise: Exercise | null;
  onClose: () => void;
  onEdit?: (ex: Exercise) => void;
}

const LEVEL_COLORS: Record<string, string> = {
  beginner: "bg-green-500/20 text-green-400 border-green-500/30",
  intermediate: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  expert: "bg-red-500/20 text-red-400 border-red-500/30",
};

export function ExerciseDetailModal({ exercise, onClose }: Props) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const images: string[] = exercise ? ((exercise as any).images ?? (exercise.gifUrl ? [exercise.gifUrl] : [])) : [];
  const level: string = (exercise as any)?.level ?? "beginner";

  useEffect(() => {
    setFrameIndex(0);
    setIsPlaying(true);
  }, [exercise?.id]);

  useEffect(() => {
    if (isPlaying && images.length > 1) {
      intervalRef.current = setInterval(() => {
        setFrameIndex((prev) => (prev + 1) % images.length);
      }, 700);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, images.length]);

  if (!exercise) return null;

  const currentImg = images.length > 0 ? images[frameIndex] : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 md:p-10 overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-4xl bg-card border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row"
        >
          {/* Left: Animated image viewer */}
          <div className="w-full md:w-[45%] bg-[#0a0a0a] flex flex-col relative">
            <div className="flex-1 flex items-center justify-center p-6 min-h-[280px] md:min-h-[400px] relative">
              {currentImg ? (
                <motion.img
                  key={currentImg}
                  src={currentImg}
                  alt={`${exercise.name} - frame ${frameIndex + 1}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="max-w-full max-h-[360px] object-contain rounded-xl"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 text-white/20">
                  <Dumbbell className="w-16 h-16" />
                  <p className="text-sm">No image available</p>
                </div>
              )}
            </div>

            {/* Image controls */}
            {images.length > 1 && (
              <div className="p-4 border-t border-white/5 flex items-center gap-3">
                <button
                  onClick={() => setFrameIndex((prev) => (prev - 1 + images.length) % images.length)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Frame dots */}
                <div className="flex gap-1.5 flex-1 justify-center">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => { setFrameIndex(i); setIsPlaying(false); }}
                      className={`h-1.5 rounded-full transition-all duration-200 ${i === frameIndex ? "bg-primary w-6" : "bg-white/20 w-1.5"}`}
                    />
                  ))}
                </div>

                <button
                  onClick={() => setIsPlaying((p) => !p)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => setFrameIndex((prev) => (prev + 1) % images.length)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Frame counter */}
            {images.length > 0 && (
              <p className="text-center text-xs text-white/30 pb-3">
                {frameIndex + 1} / {images.length}
              </p>
            )}
          </div>

          {/* Right: Details */}
          <div className="w-full md:w-[55%] flex flex-col max-h-[85vh] overflow-y-auto relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white/60 hover:text-white hover:bg-black/80 transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-7 lg:p-9 flex flex-col gap-6">
              {/* Header */}
              <div>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md bg-white/10 text-white/80 border border-white/10">
                    {exercise.bodyPart}
                  </span>
                  <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md border ${LEVEL_COLORS[level] ?? LEVEL_COLORS.beginner}`}>
                    {level}
                  </span>
                </div>
                <h2 className="text-2xl lg:text-3xl font-bold text-white capitalize leading-tight">
                  {exercise.name}
                </h2>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-black/30 border border-white/5 rounded-2xl p-4 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 text-primary text-xs font-bold uppercase tracking-wider">
                    <Target className="w-3.5 h-3.5" />
                    Target
                  </div>
                  <span className="text-base font-semibold text-white capitalize">{exercise.target}</span>
                </div>
                <div className="bg-black/30 border border-white/5 rounded-2xl p-4 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 text-orange-400 text-xs font-bold uppercase tracking-wider">
                    <Dumbbell className="w-3.5 h-3.5" />
                    Equipment
                  </div>
                  <span className="text-base font-semibold text-white capitalize">{exercise.equipment}</span>
                </div>
              </div>

              {/* Secondary muscles */}
              {exercise.secondaryMuscles && exercise.secondaryMuscles.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-white/40 text-xs font-bold uppercase tracking-wider mb-2.5">
                    <Activity className="w-3.5 h-3.5" />
                    Secondary Muscles
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {exercise.secondaryMuscles.map((muscle) => (
                      <span
                        key={muscle}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg border border-white/10 text-white/60 capitalize bg-white/5"
                      >
                        {muscle}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Instructions */}
              {exercise.instructions && exercise.instructions.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-3">Instructions</h3>
                  <ol className="space-y-3">
                    {exercise.instructions.map((step, idx) => (
                      <li key={idx} className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                          {idx + 1}
                        </span>
                        <p className="text-white/65 leading-relaxed text-sm pt-0.5">{step}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
