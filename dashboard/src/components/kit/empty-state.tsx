import * as React from "react";
import type { Icon } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

/**
 * Shown wherever there is genuinely nothing to display. Always says what is
 * missing and what puts data there. Never a substitute for a loading state,
 * and never filled with sample rows.
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
        size === "compact" ? "gap-2 px-4 py-8" : "gap-3 px-6 py-14",
        className,
      )}
    >
      {IconComponent ? (
        <span
          className={cn(
            "flex items-center justify-center rounded-md border border-line bg-surface-raised text-text-faint",
            size === "compact" ? "size-8" : "size-10",
          )}
        >
          <IconComponent size={size === "compact" ? 16 : 18} weight="regular" aria-hidden />
        </span>
      ) : null}

      <div className="max-w-sm space-y-1">
        <p className="text-sm font-medium text-text">{title}</p>
        {description ? (
          <p className="text-xs leading-relaxed text-text-muted">{description}</p>
        ) : null}
      </div>

      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
