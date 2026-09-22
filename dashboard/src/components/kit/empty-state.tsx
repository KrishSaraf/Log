import * as React from "react";
import type { Icon } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

/**
 * Shown wherever there is genuinely nothing to display. Always says what is
 * missing and what puts data there. Soft lime wash keeps morning-demo empties
 * from looking like broken panels.
 */
export function EmptyState({
  icon: IconComponent,
  title,
  description,
  action,
  size = "default",
  className,
}: {
  icon?: Icon;
  title: string;
  description?: string;
  /** A real control. Leave it out rather than shipping a button that does nothing. */
  action?: React.ReactNode;
  size?: "default" | "compact";
  className?: string;
}) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center text-center",
        "animate-[reveal-up_320ms_var(--ease-out-quint)_both]",
        "rounded-xl border border-dashed border-lime-line/40",
        "bg-[radial-gradient(ellipse_at_50%_0%,rgba(198,241,53,0.07),transparent_70%)]",
        size === "compact" ? "gap-2 px-4 py-8" : "gap-3 px-6 py-14",
        className,
      )}
    >
      {IconComponent ? (
        <span
          className={cn(
            "flex items-center justify-center rounded-lg border border-lime-line bg-lime-quiet text-lime",
            "shadow-[var(--lime-glow)] transition-transform duration-300",
            size === "compact" ? "size-8" : "size-11",
          )}
        >
          <IconComponent
            size={size === "compact" ? 16 : 20}
            weight="duotone"
            aria-hidden
          />
        </span>
      ) : null}

      <div className="max-w-sm space-y-1.5">
        <p className="text-sm font-medium text-text">{title}</p>
        {description ? (
          <p className="text-xs leading-relaxed text-text-muted">
            {description}
          </p>
        ) : null}
      </div>

      {action ? (
        <div className="pt-1 animate-[reveal-up_360ms_var(--ease-out-quint)_both]">
          {action}
        </div>
      ) : null}
    </div>
  );
}
