import { cn } from "@/lib/utils";

/**
 * Monogram plus wordmark. The ember tile is the only saturated element in the
 * chrome, which is what makes the accent read as the app's signature.
 */
export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-ember text-[0.6875rem] font-semibold text-on-ember">
        K
      </span>
      <span className="flex min-w-0 flex-col leading-none">
        <span className="text-sm font-medium tracking-tight text-text">Log</span>
        <span className="mt-0.5 text-[0.625rem] tracking-wide text-text-faint">
          Krish
        </span>
      </span>
    </span>
  );
}
