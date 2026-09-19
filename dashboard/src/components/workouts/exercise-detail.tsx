"use client";

import { useEffect, useRef, useState } from "react";
import {
  BarbellIcon,
  CaretLeftIcon,
  CaretRightIcon,
  PauseIcon,
  PlayIcon,
  TargetIcon,
} from "@phosphor-icons/react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  exerciseImages,
  type ExerciseRecord,
} from "@/lib/exercise-display";
import { cn } from "@/lib/utils";

const LEVEL_TONE: Record<string, string> = {
  beginner: "border-positive/30 bg-positive/10 text-positive",
  intermediate: "border-ember-line bg-ember-quiet text-ember-bright",
  expert: "border-negative/30 bg-negative/10 text-negative",
};

export function ExerciseDetail({
  exercise,
  onClose,
}: {
  exercise: ExerciseRecord | null;
  onClose: () => void;
}) {
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const images = exercise ? exerciseImages(exercise) : [];
  const current = images.length > 0 ? images[frame % images.length] : null;

  useEffect(() => {
    setFrame(0);
    setPlaying(true);
  }, [exercise?.id]);

  useEffect(() => {
    if (playing && images.length > 1) {
      timer.current = setInterval(() => {
        setFrame((prev) => (prev + 1) % images.length);
      }, 700);
    } else if (timer.current) {
      clearInterval(timer.current);
    }
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing, images.length]);

  const level = exercise?.level ?? "beginner";

  return (
    <Dialog open={exercise !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton
        className="max-h-[90vh] overflow-y-auto p-0 sm:max-w-3xl"
      >
        {exercise ? (
          <div className="grid md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
            <div className="flex flex-col bg-surface-sunken">
              <div className="relative flex min-h-64 items-center justify-center p-5">
                {current ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={current}
                    alt=""
                    className="max-h-80 w-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-text-faint">
                    <BarbellIcon size={40} aria-hidden />
                    <p className="text-xs">No photo for this movement</p>
                  </div>
                )}
              </div>

              {images.length > 1 ? (
                <div className="flex items-center gap-2 border-t border-line px-4 py-3">
                  <button
                    type="button"
                    onClick={() =>
                      setFrame((prev) => (prev - 1 + images.length) % images.length)
                    }
                    className="rounded-md p-1.5 text-text-muted hover:bg-surface-raised hover:text-text"
                    aria-label="Previous photo"
                  >
                    <CaretLeftIcon size={16} />
                  </button>
                  <div className="flex flex-1 justify-center gap-1.5">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setFrame(i);
                          setPlaying(false);
                        }}
                        aria-label={`Photo ${i + 1}`}
                        className={cn(
                          "h-1.5 rounded-full transition-all",
                          i === frame ? "w-5 bg-ember" : "w-1.5 bg-line-strong",
                        )}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPlaying((prev) => !prev)}
                    className="rounded-md p-1.5 text-text-muted hover:bg-surface-raised hover:text-text"
                    aria-label={playing ? "Pause photos" : "Play photos"}
                  >
                    {playing ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFrame((prev) => (prev + 1) % images.length)}
                    className="rounded-md p-1.5 text-text-muted hover:bg-surface-raised hover:text-text"
                    aria-label="Next photo"
                  >
                    <CaretRightIcon size={16} />
                  </button>
                </div>
              ) : null}

              {images.length > 0 ? (
                <p className="pb-3 text-center text-micro text-text-faint">
                  {frame + 1} / {images.length}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-5 p-6">
              <DialogHeader className="pr-8">
                <div className="mb-2 flex flex-wrap gap-1.5">
                  <span className="rounded-md border border-line bg-surface-raised px-2 py-0.5 text-micro font-medium tracking-wide text-text-muted uppercase">
                    {exercise.bodyPart}
                  </span>
                  <span
                    className={cn(
                      "rounded-md border px-2 py-0.5 text-micro font-medium tracking-wide uppercase",
                      LEVEL_TONE[level] ?? LEVEL_TONE.beginner,
                    )}
                  >
                    {level}
                  </span>
                </div>
                <DialogTitle className="text-xl capitalize">
                  {exercise.name}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  How to perform {exercise.name}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-line bg-surface-sunken p-3">
                  <p className="label-caps flex items-center gap-1.5">
                    <TargetIcon size={12} className="text-ember" aria-hidden />
                    Target
                  </p>
                  <p className="mt-1.5 text-sm font-medium capitalize text-text">
                    {exercise.target}
                  </p>
                </div>
                <div className="rounded-lg border border-line bg-surface-sunken p-3">
                  <p className="label-caps flex items-center gap-1.5">
                    <BarbellIcon size={12} className="text-ember" aria-hidden />
                    Equipment
                  </p>
                  <p className="mt-1.5 text-sm font-medium capitalize text-text">
                    {exercise.equipment}
                  </p>
                </div>
              </div>

              {exercise.secondaryMuscles.length > 0 ? (
                <div>
                  <p className="label-caps mb-2">Also works</p>
                  <div className="flex flex-wrap gap-1.5">
                    {exercise.secondaryMuscles.map((muscle) => (
                      <span
                        key={muscle}
                        className="rounded-md border border-line bg-surface-raised px-2 py-1 text-xs capitalize text-text-muted"
                      >
                        {muscle}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {exercise.instructions.length > 0 ? (
                <div>
                  <h3 className="mb-3 text-sm font-medium text-text">How to do it</h3>
                  <ol className="space-y-3">
                    {exercise.instructions.map((step, index) => (
                      <li key={index} className="flex gap-3">
                        <span className="num mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-ember-quiet text-micro font-medium text-ember">
                          {index + 1}
                        </span>
                        <p className="text-sm leading-relaxed text-text-muted">
                          {step}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
