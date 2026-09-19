"use client";

import { useEffect, useRef, useState } from "react";
import { BarbellIcon, TargetIcon } from "@phosphor-icons/react";

import {
  exerciseImages,
  type ExerciseRecord,
} from "@/lib/exercise-display";
import { cn } from "@/lib/utils";

export function ExerciseCard({
  exercise,
  onOpen,
}: {
  exercise: ExerciseRecord;
  onOpen: (exercise: ExerciseRecord) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [frame, setFrame] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const images = exerciseImages(exercise);
  const current = images.length > 0 ? images[frame % images.length] : null;

  useEffect(() => {
    if (hovered && images.length > 1) {
      timer.current = setInterval(() => {
        setFrame((prev) => (prev + 1) % images.length);
      }, 600);
    } else {
      if (timer.current) clearInterval(timer.current);
      setFrame(0);
    }
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [hovered, images.length]);

  return (
    <button
      type="button"
      onClick={() => onOpen(exercise)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "group flex flex-col overflow-hidden rounded-lg border border-line bg-surface text-left",
        "transition-colors duration-150 hover:border-ember-line",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-sunken">
        {current ? (
          // External catalogue photos; <img> avoids next/image host config.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <BarbellIcon size={36} className="text-text-faint/40" aria-hidden />
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />

        <div className="absolute inset-x-2.5 top-2.5 flex items-start justify-between gap-2">
          <span className="rounded-md border border-white/10 bg-black/65 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-white/90 uppercase">
            {exercise.bodyPart}
          </span>
          <span className="rounded-md border border-ember-line bg-ember/85 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-on-ember uppercase">
            {exercise.equipment}
          </span>
        </div>

        {images.length > 1 && hovered ? (
          <div className="absolute inset-x-2.5 bottom-2.5 flex gap-1">
            {images.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-0.5 flex-1 rounded-full",
                  i === frame % images.length ? "bg-ember" : "bg-white/25",
                )}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 text-sm font-medium capitalize leading-snug text-text">
          {exercise.name}
        </h3>
        <p className="flex items-center gap-1.5 text-xs text-text-muted capitalize">
          <TargetIcon size={13} className="shrink-0 text-text-faint" aria-hidden />
          <span className="truncate">{exercise.target}</span>
        </p>
      </div>
    </button>
  );
}
