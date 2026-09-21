"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartFrame } from "@/components/kit";
import {
  axisProps,
  CHART_COLORS,
  CHART_HEIGHT,
  gridProps,
  tooltipProps,
} from "@/lib/chart-theme";
import { formatDuration, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export type SleepTrendPoint = {
  date: string;
  /** Hours slept that night. */
  hours: number;
  /** Optional subjective quality 1–5. */
  quality: number | null;
};

function qualityFill(quality: number | null): string {
  if (quality == null) return CHART_COLORS.lime;
  if (quality <= 2) return CHART_COLORS.steel;
  if (quality === 3) return CHART_COLORS.leaf;
  return CHART_COLORS.lime;
}

function qualityLabel(quality: number | null): string {
  if (quality == null) return "—";
  const labels = ["Rough", "Fair", "OK", "Good", "Great"];
  return `${quality} · ${labels[quality - 1] ?? ""}`;
}

/**
 * Nightly sleep as soft lime bars — quality tints the fill, average draws a
 * quiet reference line. Beauty over density.
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
      <div className={cn("space-y-3", className)}>
        <ChartFrame
          isEmpty
          height={height}
          emptyLabel="Sleep nights will plot here — log last night from Today"
        />
        <a
          href="#quick-log"
          className="inline-flex min-h-10 items-center rounded-lg border border-lime-line bg-lime-quiet px-3 text-sm font-medium text-lime transition-opacity hover:opacity-90"
        >
          Log sleep
        </a>
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

  const maxHours = Math.max(...points.map((p) => p.hours), 8);
  const yMax = Math.min(14, Math.ceil(maxHours + 0.5));

  return (
    <div className={cn("space-y-4", className)}>
      <ul className="grid grid-cols-3 gap-3">
        <Stat
          label="Average"
          value={`${avg.toFixed(1)}h`}
          hint={`${points.length} night${points.length === 1 ? "" : "s"}`}
        />
        <Stat
          label="Last night"
          value={`${latest.hours.toFixed(1)}h`}
          hint={formatShortDate(latest.date)}
        />
        <Stat
          label="Quality"
          value={
            avgQuality != null ? avgQuality.toFixed(1) : "—"
          }
          hint={avgQuality != null ? "avg / 5" : "not logged"}
        />
      </ul>

      <ChartFrame height={height} caption="Hours per night · quality tints the bars">
        <BarChart
          data={points}
          margin={{ top: 12, right: 8, left: 0, bottom: 0 }}
          barCategoryGap="28%"
        >
          <defs>
            <linearGradient id="sleepBarGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.lime} stopOpacity={0.95} />
              <stop offset="100%" stopColor={CHART_COLORS.lime} stopOpacity={0.55} />
            </linearGradient>
          </defs>
          <CartesianGrid {...gridProps} />
          <XAxis
            {...axisProps}
            dataKey="date"
            tickFormatter={(value: string) => formatShortDate(value)}
            minTickGap={24}
          />
          <YAxis
            {...axisProps}
            domain={[0, yMax]}
            width={36}
            tickFormatter={(value: number) => `${value}`}
            unit="h"
          />
          <Tooltip
            {...tooltipProps}
            cursor={{ fill: "rgba(198,241,53,0.06)" }}
            labelFormatter={(value) => formatShortDate(String(value))}
            formatter={(value, _name, item) => {
              const quality = (item?.payload as SleepTrendPoint | undefined)
                ?.quality;
              const hours = Number(value);
              const mins = Math.round(hours * 60);
              return [
                `${formatDuration(mins)} · Q ${qualityLabel(quality ?? null)}`,
                "Sleep",
              ];
            }}
          />
          <ReferenceLine
            y={avg}
            stroke={CHART_COLORS.mist}
            strokeDasharray="4 4"
            strokeOpacity={0.7}
            ifOverflow="extendDomain"
          />
          <Bar
            dataKey="hours"
            radius={[6, 6, 2, 2]}
            maxBarSize={28}
            isAnimationActive
            animationDuration={700}
            animationEasing="ease-out"
          >
            {points.map((point) => (
              <Cell
                key={point.date}
                fill={
                  point.quality == null || point.quality >= 4
                    ? "url(#sleepBarGlow)"
                    : qualityFill(point.quality)
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ChartFrame>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <li className="rounded-lg border border-line bg-surface-sunken/60 px-3 py-2.5">
      <p className="label-caps">{label}</p>
      <p className="num mt-1 text-lg font-medium text-text">{value}</p>
      <p className="mt-0.5 truncate text-xs text-text-faint">{hint}</p>
    </li>
  );
}
