"use client";

import * as React from "react";

import { CHART_COLORS, CHART_HEIGHT } from "@/lib/chart-theme";
import { cn } from "@/lib/utils";

/** Soft SVG silhouette so empty chart panels never look like blank Recharts. */
function EmptyChartGhost({ height }: { height: number }) {
  const width = 320;
  const pad = 24;
  const mid = height * 0.55;
  const pts = Array.from({ length: 9 }, (_, i) => {
    const x = pad + (i / 8) * (width - pad * 2);
    const y = mid + Math.sin(i * 0.85) * (height * 0.16) - (i % 3) * 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="pointer-events-none absolute inset-0 size-full"
      aria-hidden
      preserveAspectRatio="none"
    >
      <polyline
        points={pts}
        fill="none"
        stroke={CHART_COLORS.lime}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity={0.22}
        strokeDasharray="4 5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * Sized frame for SVG charts. Empty panels show a ghost sparkline + copy —
 * never a blank rectangle that looks like a failed chart mount.
 */
export function ChartFrame({
  children,
  height = CHART_HEIGHT.default,
  isEmpty = false,
  emptyLabel = "No data for this range yet",
  emptyAction,
  caption,
  className,
}: {
  children?: React.ReactNode;
  height?: number;
  isEmpty?: boolean;
  emptyLabel?: string;
  /** Optional CTA under the empty label (e.g. Log sleep). */
  emptyAction?: React.ReactNode;
  /** One short line under the chart, for units or the comparison window. */
  caption?: string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      {isEmpty || !children ? (
        <div
          style={{ height }}
          className={cn(
            "relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-xl",
            "border border-dashed border-lime-line/45",
            "bg-[radial-gradient(ellipse_at_50%_0%,rgba(198,241,53,0.07),transparent_65%)]",
            "bg-surface-sunken/60",
          )}
        >
          <EmptyChartGhost height={height} />
          <div className="relative z-[1] max-w-[18rem] space-y-2 px-4 text-center">
            <p className="text-xs leading-relaxed text-text-muted">{emptyLabel}</p>
            {emptyAction ? <div className="flex justify-center">{emptyAction}</div> : null}
          </div>
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
