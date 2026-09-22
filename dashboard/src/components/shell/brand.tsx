import { cn } from "@/lib/utils";

/**
 * Monogram plus wordmark. The lime tile is the brand signal in chrome —
 * Log reads first, Krish sits quietly underneath.
 */
export function Brand({
  className,
  size = "default",
}: {
  className?: string;
  size?: "default" | "hero";
}) {
  if (size === "hero") {
    return (
      <span className={cn("flex flex-col items-start gap-3", className)}>
        <span className="flex size-11 items-center justify-center rounded-xl bg-lime text-lg font-semibold text-on-lime shadow-[var(--lime-glow)]">
          K
        </span>
        <span className="font-display text-4xl font-semibold tracking-tight text-text sm:text-5xl">
          Log
        </span>
        <span className="text-sm tracking-wide text-text-muted">Krish</span>
      </span>
    );
  }

  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-lime text-[0.7rem] font-semibold text-on-lime">
        K
      </span>
      <span className="flex min-w-0 flex-col leading-none">
        <span className="font-display text-[0.95rem] font-semibold tracking-tight text-text">
          Log
        </span>
        <span className="mt-0.5 text-[0.625rem] tracking-wide text-text-faint">
          Krish
        </span>
      </span>
    </span>
  );
}
