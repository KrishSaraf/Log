import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import type { Exercise } from "@workspace/api-client-react";
import { Dumbbell, Target } from "lucide-react";

interface Props {
  exercise: Exercise;
  onClick: (exercise: Exercise) => void;
  index: number;
}

export function ExerciseCard({ exercise, onClick, index }: Props) {
  const [isHovered, setIsHovered] = useState(false);
  const [frameIndex, setFrameIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const images: string[] = (exercise as any).images ?? (exercise.gifUrl ? [exercise.gifUrl] : []);
  const hasImages = images.length > 0;
  const currentImg = hasImages ? images[frameIndex % images.length] : null;

  useEffect(() => {
    if (isHovered && images.length > 1) {
      intervalRef.current = setInterval(() => {
        setFrameIndex((prev) => (prev + 1) % images.length);
      }, 600);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setFrameIndex(0);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isHovered, images.length]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.5), duration: 0.3, ease: "easeOut" }}
      onClick={() => onClick(exercise)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative bg-card rounded-2xl border border-white/5 overflow-hidden cursor-pointer hover:border-primary/40 transition-all duration-300 shadow-lg hover:shadow-primary/10 hover:-translate-y-1"
    >
      {/* Image area */}
      <div className="aspect-[4/3] bg-[#111] flex items-center justify-center relative overflow-hidden">
        {currentImg ? (
          <img
            key={currentImg}
            src={currentImg}
            alt={exercise.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-gray-900 to-gray-950">
            <Dumbbell className="w-14 h-14 text-white/10" />
          </div>
        )}

        {/* Gradient overlay at bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

        {/* Top badges */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-10">
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-black/70 backdrop-blur-sm text-white/90 border border-white/10">
            {exercise.bodyPart}
          </span>
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-primary/80 backdrop-blur-sm text-white border border-primary/20">
            {exercise.equipment}
          </span>
        </div>

        {/* Hover animation indicator */}
        {images.length > 1 && isHovered && (
          <div className="absolute bottom-3 left-3 right-3 flex gap-1 justify-center z-10">
            {images.map((_, i) => (
              <div
                key={i}
                className={`h-0.5 rounded-full flex-1 transition-all duration-200 ${i === frameIndex % images.length ? "bg-primary" : "bg-white/20"}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-bold text-base text-white capitalize leading-tight mb-2 line-clamp-2">
          {exercise.name}
        </h3>
        <div className="flex items-center gap-1.5 text-white/50 text-sm">
          <Target className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="capitalize truncate">{exercise.target}</span>
        </div>
      </div>
    </motion.div>
  );
}
