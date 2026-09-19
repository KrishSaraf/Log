import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Separates groups of panels inside a page. Title left, optional actions
 * right, a hairline underneath. Use at most three per page so the rhythm of
 * the page stays legible.
 */
export function SectionHeader({
  title,
  caption,
  actions,
  className,
}: {
  title: string;
  caption?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-end justify-between gap-4 border-b border-line pb-2",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="truncate text-[0.9375rem] font-medium tracking-tight text-text">
          {title}
        </h2>
        {caption ? (
          <p className="mt-0.5 truncate text-xs text-text-muted">{caption}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
