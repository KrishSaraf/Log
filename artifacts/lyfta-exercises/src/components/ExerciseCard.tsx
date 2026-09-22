import { useEffect, useRef, useState } from "react";
import type { Exercise } from "@workspace/api-client-react";
import { Dumbbell } from "lucide-react";

function mediaUrls(ex: Exercise): string[] {
  if (ex.images?.length) return ex.images;
  return ex.gifUrl ? [ex.gifUrl] : [];
}

export function ExerciseCard({
  exercise,
  onOpen,
  index,
}: {
  exercise: Exercise;
  onOpen: (ex: Exercise) => void;
  index: number;
}) {
  const images = mediaUrls(exercise);
  const [hover, setHover] = useState(false);
  const [frame, setFrame] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (hover && images.length > 1) {
      timer.current = setInterval(() => {
        setFrame((f) => (f + 1) % images.length);
      }, 550);
    } else {
      if (timer.current) clearInterval(timer.current);
      setFrame(0);
    }
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [hover, images.length]);

  const src = images[frame % Math.max(images.length, 1)];

  return (
    <button
      type="button"
      onClick={() => onOpen(exercise)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      className="group text-left rounded-xl border border-border bg-elevated overflow-hidden transition-all duration-[var(--kw-duration)] ease-[var(--kw-ease)] hover:border-accent/40 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent rise-in"
      style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
    >
      <div className="relative aspect-[4/3] bg-black/40 overflow-hidden">
        {src ? (
          <img
            src={src}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Dumbbell className="size-12 text-white/10" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
        <div className="absolute left-3 top-3 flex gap-2">
          <span className="rounded-md bg-black/65 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/90 border border-white/10 capitalize">
            {exercise.bodyPart}
          </span>
        </div>
        <span className="absolute bottom-3 right-3 rounded-md bg-accent/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-ink capitalize">
          {exercise.equipment}
        </span>
      </div>
      <div className="p-4 space-y-1.5">
        <h3 className="font-display font-bold text-base leading-snug capitalize line-clamp-2">
          {exercise.name}
        </h3>
        <p className="text-sm text-muted capitalize truncate">{exercise.target}</p>
      </div>
    </button>
  );
}
