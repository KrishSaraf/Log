import * as React from "react";
import {
  ArrowDownRightIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

export type MetricDelta = {
  /** Signed change against the comparison window. */
  value: number;
  /** For example "vs 7-day average". Rendered verbatim. */
  label?: string;
  /**
   * Whether a rise is good. Resting heart rate and body fat set this to
   * "down", steps and sleep leave it at "up". Set to "neutral" for figures
   * with no better direction.
   */
  goodDirection?: "up" | "down" | "neutral";
  /** Render the delta as a percentage rather than an absolute number. */
  asPercent?: boolean;
};

function formatDelta(delta: MetricDelta) {
  const sign = delta.value > 0 ? "+" : "";
  const body = delta.asPercent
    ? `${Math.abs(delta.value).toFixed(1)}%`
    : Math.abs(delta.value).toLocaleString();
  return delta.value === 0 ? body : `${sign}${delta.value < 0 ? "-" : ""}${body}`;
}

function deltaTone(delta: MetricDelta) {
  const direction = delta.goodDirection ?? "up";
  if (direction === "neutral" || delta.value === 0) return "text-text-muted";
  const isGood = direction === "up" ? delta.value > 0 : delta.value < 0;
  return isGood ? "text-positive" : "text-negative";
}

/**
 * A single figure with its label, unit and optional trend. `value` of null is
 * the honest default: it renders a no-data state rather than a zero, because
 * "nothing logged" and "logged a zero" mean different things here.
 */
export function MetricCard({
  label,
  value,
  unit,
  delta,
  icon: IconComponent,
  footnote,
  sparkline,
  className,
}: {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
  delta?: MetricDelta;
  icon?: Icon;
  footnote?: string;
  /** Slot for a small inline chart, typically a ChartFrame in bare mode. */
  sparkline?: React.ReactNode;
  className?: string;
}) {
  const hasValue = value !== null && value !== undefined && value !== "";
  const display =
    typeof value === "number" ? value.toLocaleString() : (value ?? null);

  const DeltaIcon = !delta
    ? null
    : delta.value > 0
      ? ArrowUpRightIcon
      : delta.value < 0
        ? ArrowDownRightIcon
        : ArrowRightIcon;

  return (
    <div
      data-slot="metric-card"
      className={cn(
        "group relative flex min-w-0 flex-col justify-between gap-3 rounded-lg border border-line bg-surface p-4",
        "transition-colors duration-150 hover:border-line-strong",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="label-caps truncate">{label}</span>
        {IconComponent ? (
          <IconComponent
            size={14}
            weight="regular"
            className="shrink-0 text-text-faint transition-colors duration-150 group-hover:text-ember"
            aria-hidden
          />
        ) : null}
      </div>

      <div className="flex min-w-0 items-baseline gap-1.5">
        {hasValue ? (
          <>
            <span className="num truncate text-[1.75rem] leading-none font-medium text-text">
              {display}
            </span>
            {unit ? (
              <span className="shrink-0 text-xs text-text-faint">{unit}</span>
            ) : null}
          </>
        ) : (
          <span className="text-sm text-text-faint">Not logged yet</span>
        )}
      </div>

      {sparkline ? <div className="h-9">{sparkline}</div> : null}

      {hasValue && delta && DeltaIcon ? (
        <div className="flex items-center gap-1.5 text-xs">
          <DeltaIcon size={13} weight="bold" className={deltaTone(delta)} aria-hidden />
          <span className={cn("num", deltaTone(delta))}>{formatDelta(delta)}</span>
          {delta.label ? (
            <span className="truncate text-text-faint">{delta.label}</span>
          ) : null}
        </div>
      ) : footnote ? (
        <p className="truncate text-xs text-text-faint">{footnote}</p>
      ) : null}
    </div>
  );
}

/** Alias kept because both names are used in the design docs. */
export const StatTile = MetricCard;
