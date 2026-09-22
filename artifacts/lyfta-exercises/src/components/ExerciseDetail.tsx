import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Pencil,
  Trash2,
  Dumbbell,
} from "lucide-react";
import type { Exercise } from "@workspace/api-client-react";
import { Button } from "@/components/primitives";

const LEVEL: Record<string, string> = {
  beginner: "text-success",
  intermediate: "text-warning",
  expert: "text-danger",
};

function mediaUrls(ex: Exercise): string[] {
  if (ex.images?.length) return ex.images;
  return ex.gifUrl ? [ex.gifUrl] : [];
}

export function ExerciseDetail({
  exercise,
  onClose,
  onEdit,
  onDelete,
}: {
  exercise: Exercise | null;
  onClose: () => void;
  onEdit: (ex: Exercise) => void;
  onDelete: (ex: Exercise) => void;
}) {
  const images = exercise ? mediaUrls(exercise) : [];
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setFrame(0);
    setPlaying(true);
  }, [exercise?.id]);

  useEffect(() => {
    if (playing && images.length > 1) {
      timer.current = setInterval(() => {
        setFrame((f) => (f + 1) % images.length);
      }, 650);
    } else if (timer.current) {
      clearInterval(timer.current);
    }
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing, images.length]);

  useEffect(() => {
    if (!exercise) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [exercise, onClose]);

  return (
    <AnimatePresence>
      {exercise ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="exercise-title"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl max-h-[92dvh] overflow-hidden rounded-t-2xl sm:rounded-2xl border border-border bg-elevated shadow-[var(--kw-shadow)] flex flex-col md:flex-row"
          >
            <div className="md:w-[44%] bg-black/50 flex flex-col min-h-[240px]">
              <div className="relative flex-1 flex items-center justify-center p-5 min-h-[220px]">
                {images[frame] ? (
                  <img
                    key={images[frame]}
                    src={images[frame]}
                    alt=""
                    className="max-h-[320px] w-full object-contain fade-in"
                  />
                ) : (
                  <Dumbbell className="size-16 text-white/15" />
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="absolute right-3 top-3 md:hidden tap-target flex items-center justify-center rounded-full bg-black/60 text-white/80"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </div>
              {images.length > 1 ? (
                <div className="flex items-center gap-2 border-t border-border px-4 py-3">
                  <button
                    type="button"
                    className="tap-target flex items-center justify-center rounded-lg text-muted hover:text-foreground"
                    onClick={() =>
                      setFrame((f) => (f - 1 + images.length) % images.length)
                    }
                    aria-label="Previous frame"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  <div className="flex flex-1 justify-center gap-1.5">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        aria-label={`Frame ${i + 1}`}
                        onClick={() => {
                          setFrame(i);
                          setPlaying(false);
                        }}
                        className={`h-1.5 rounded-full transition-all ${
                          i === frame ? "w-6 bg-accent" : "w-1.5 bg-white/20"
                        }`}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    className="tap-target flex items-center justify-center rounded-lg text-muted hover:text-foreground"
                    onClick={() => setPlaying((p) => !p)}
                    aria-label={playing ? "Pause" : "Play"}
                  >
                    {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
                  </button>
                  <button
                    type="button"
                    className="tap-target flex items-center justify-center rounded-lg text-muted hover:text-foreground"
                    onClick={() => setFrame((f) => (f + 1) % images.length)}
                    aria-label="Next frame"
                  >
                    <ChevronRight className="size-5" />
                  </button>
                </div>
              ) : null}
            </div>

            <div className="md:w-[56%] overflow-y-auto relative">
              <button
                type="button"
                onClick={onClose}
                className="hidden md:flex absolute right-4 top-4 tap-target items-center justify-center rounded-full bg-white/5 text-muted hover:text-foreground"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>

              <div className="space-y-6 p-6 sm:p-8">
                <div>
                  <div className="mb-3 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wider">
                    <span className="rounded-md border border-border bg-surface px-2.5 py-1 capitalize text-muted">
                      {exercise.bodyPart}
                    </span>
                    <span
                      className={`rounded-md border border-border bg-surface px-2.5 py-1 capitalize ${
                        LEVEL[exercise.level] ?? LEVEL.beginner
                      }`}
                    >
                      {exercise.level}
                    </span>
                  </div>
                  <h2
                    id="exercise-title"
                    className="pr-10 text-2xl sm:text-3xl font-display font-extrabold capitalize leading-tight"
                  >
                    {exercise.name}
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border bg-surface/60 p-4">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-accent mb-1">
                      Target
                    </div>
                    <div className="text-lg font-semibold capitalize tabular-nums">
                      {exercise.target}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-surface/60 p-4">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-accent mb-1">
                      Equipment
                    </div>
                    <div className="text-lg font-semibold capitalize">
                      {exercise.equipment}
                    </div>
                  </div>
                </div>

                {exercise.secondaryMuscles?.length ? (
                  <div>
                    <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-faint">
                      Secondary muscles
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {exercise.secondaryMuscles.map((m) => (
                        <span
                          key={m}
                          className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs capitalize text-muted"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {exercise.instructions?.length ? (
                  <div>
                    <h3 className="mb-3 text-lg font-display font-bold">How to</h3>
                    <ol className="space-y-3">
                      {exercise.instructions.map((step, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-muted text-xs font-bold text-accent">
                            {i + 1}
                          </span>
                          <p className="text-sm leading-relaxed text-muted pt-0.5">
                            {step}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                  <Button variant="surface" onClick={() => onEdit(exercise)}>
                    <Pencil className="size-4" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-danger hover:text-danger"
                    onClick={() => onDelete(exercise)}
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
