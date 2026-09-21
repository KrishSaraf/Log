"use client";

import { ChartFrame } from "@/components/kit";
import { SimpleBarChart } from "@/components/kit/simple-charts";
import { CHART_COLORS, CHART_HEIGHT } from "@/lib/chart-theme";
import { formatDuration, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export type SleepTrendPoint = {
  date: string;
  /** Hours slept that night. */
  hours: number;
  /** Optional subjective quality 1–5. */
  quality: number | null;
};

function qualityFill(quality: number | null): string | undefined {
  if (quality == null) return undefined; // chart uses lime glow gradient
  if (quality <= 2) return CHART_COLORS.steel;
  if (quality === 3) return CHART_COLORS.leaf;
  return undefined;
}

function qualityLabel(quality: number | null): string {
  if (quality == null) return "—";
  const labels = ["Rough", "Fair", "OK", "Good", "Great"];
  return `${quality} · ${labels[quality - 1] ?? ""}`;
}

/**
 * Nightly sleep as soft lime bars — quality tints the fill, average draws a
 * quiet reference line. Pure SVG so it never blanks.
 */
export function SleepTrend({
  points,
  height = CHART_HEIGHT.default,
  className,
}: {
  points: SleepTrendPoint[];
  height?: number;
  className?: string;
}) {
  if (points.length === 0) {
    return (
      <div className={cn(className)}>
        <ChartFrame
          isEmpty
          height={height}
          emptyLabel="Sleep nights will plot here — log last night from Today"
          emptyAction={
            <a
              href="#quick-log"
              className="inline-flex min-h-10 items-center rounded-lg border border-lime-line bg-lime-quiet px-3 text-sm font-medium text-lime transition-opacity hover:opacity-90"
            >
              Log sleep
            </a>
          }
        />
      </div>
    );
  }

  const avg =
    points.reduce((acc, p) => acc + p.hours, 0) / Math.max(1, points.length);
  const latest = points[points.length - 1];
  const withQuality = points.filter((p) => p.quality != null);
  const avgQuality =
    withQuality.length > 0
      ? withQuality.reduce((acc, p) => acc + (p.quality ?? 0), 0) /
        withQuality.length
      : null;

  return (
    <div className={cn("space-y-4", className)}>
      <ul className="grid grid-cols-3 gap-2.5">
        <Stat
          label="Average"
          value={`${avg.toFixed(1)}h`}
          hint={`${points.length} night${points.length === 1 ? "" : "s"}`}
          accent
        />
        <Stat
          label="Last night"
          value={`${latest.hours.toFixed(1)}h`}
          hint={
            latest.quality != null
              ? `${formatShortDate(latest.date)} · Q ${qualityLabel(latest.quality)}`
              : formatShortDate(latest.date)
          }
        />
        <Stat
          label="Quality"
          value={avgQuality != null ? avgQuality.toFixed(1) : "—"}
          hint={avgQuality != null ? "avg / 5" : "not logged"}
        />
      </ul>

      <ChartFrame
        height={height}
        caption="Hours per night · quality tints the bars"
      >
        <SimpleBarChart
          points={points.map((p) => ({
            date: p.date,
            value: p.hours,
            fill: qualityFill(p.quality),
          }))}
          height={height}
          label="Sleep"
          unit="h"
          average={avg}
          formatValue={(n) => {
            if (n < 0.05) return "0";
            return n.toFixed(n >= 10 ? 0 : 1);
          }}
        />
      </ChartFrame>

      {latest ? (
        <p className="text-xs text-text-faint">
          Last night{" "}
          <span className="num text-text-muted">
            {formatDuration(Math.round(latest.hours * 60))}
          </span>
          {latest.quality != null
            ? ` · felt ${qualityLabel(latest.quality).split(" · ")[1]?.toLowerCase() ?? "ok"}`
            : ""}
          . Aim near the dashed average.
        </p>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <li
      className={cn(
        "rounded-xl border px-3 py-2.5 transition-colors",
        accent
          ? "border-lime-line/60 bg-lime-quiet/35"
          : "border-line bg-surface-sunken/50",
      )}
    >
      <p className="label-caps">{label}</p>
      <p
        className={cn(
          "num mt-1 text-lg font-medium tracking-tight",
          accent ? "text-lime" : "text-text",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 truncate text-xs text-text-faint">{hint}</p>
    </li>
  );
}
