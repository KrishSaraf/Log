"use client";

import * as React from "react";

import { CHART_HEIGHT } from "@/lib/chart-theme";
import { cn } from "@/lib/utils";

/**
 * Sized frame for SVG charts (and legacy empty states). No Recharts
 * ResponsiveContainer — that was the source of blank panels when width
 * resolved to 0 during SSR/hydration.
 */
export function ChartFrame({
  children,
  height = CHART_HEIGHT.default,
  isEmpty = false,
  emptyLabel = "No data for this range yet",
  caption,
  className,
}: {
  children?: React.ReactNode;
  height?: number;
  isEmpty?: boolean;
  emptyLabel?: string;
  /** One short line under the chart, for units or the comparison window. */
  caption?: string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      {isEmpty || !children ? (
        <div
          style={{ height }}
          className="flex items-center justify-center rounded-md border border-dashed border-line bg-surface-sunken"
        >
          <p className="px-4 text-center text-xs text-text-faint">{emptyLabel}</p>
        </div>
      ) : (
        <div style={{ height }} className="w-full min-w-0">
          {children}
        </div>
      )}
      {caption ? (
        <p className="mt-2 text-xs text-text-faint">{caption}</p>
      ) : null}
    </div>
  );
}

/** Small colour key for multi-series charts. Keep to four entries or fewer. */
export function ChartLegend({
  items,
  className,
}: {
  items: { label: string; color: string }[];
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-1.5", className)}>
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-xs text-text-muted">
          <span
            aria-hidden
            className="size-2 rounded-[2px]"
            style={{ background: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
