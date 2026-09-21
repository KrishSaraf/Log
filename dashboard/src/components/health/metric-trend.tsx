"use client";

import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";

import { ChartFrame } from "@/components/kit";
import {
  axisProps,
  CHART_COLORS,
  CHART_HEIGHT,
  gridProps,
  tooltipProps,
} from "@/lib/chart-theme";
import { formatShortDate } from "@/lib/format";
import type { MetricPoint } from "@/lib/health-log";

type FormatMode = "int" | "fixed1" | "raw";

function formatByMode(n: number, mode: FormatMode) {
  if (mode === "fixed1") return n.toFixed(1);
  if (mode === "int") return String(Math.round(n));
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function MetricTrend({
  points,
  label,
  unit,
  height = CHART_HEIGHT.default,
  format = "raw",
}: {
  points: MetricPoint[];
  label: string;
  unit?: string;
  height?: number;
  /** Serializable format hint — avoid passing functions from Server Components. */
  format?: FormatMode;
}) {
  if (points.length === 0) {
    return (
      <ChartFrame
        isEmpty
        height={height}
        emptyLabel={`${label} will plot here`}
      />
    );
  }

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const pad = span === 0 ? Math.max(1, max * 0.05) : span * 0.12;

  return (
    <ChartFrame height={height} caption={unit}>
      <LineChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid {...gridProps} />
        <XAxis
          {...axisProps}
          dataKey="date"
          tickFormatter={(value: string) => formatShortDate(value)}
          minTickGap={28}
        />
        <YAxis
          {...axisProps}
          domain={[min - pad, max + pad]}
          width={40}
          tickFormatter={(value: number) => formatByMode(value, format)}
        />
        <Tooltip
          {...tooltipProps}
          labelFormatter={(value) => formatShortDate(String(value))}
          formatter={(value) => [
            `${formatByMode(Number(value), format)}${unit ? ` ${unit}` : ""}`,
            label,
          ]}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={CHART_COLORS.lime}
          strokeWidth={1.75}
          dot={false}
          activeDot={{ r: 3, fill: CHART_COLORS.lime, stroke: "none" }}
        />
      </LineChart>
    </ChartFrame>
  );
}
