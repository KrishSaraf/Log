"use client";

import { ChartFrame } from "@/components/kit";
import { SimpleLineChart } from "@/components/kit/simple-charts";
import { CHART_HEIGHT } from "@/lib/chart-theme";
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

  return (
    <ChartFrame height={height} caption={unit}>
      <SimpleLineChart
        points={points.map((p) => ({ date: p.date, value: p.value }))}
        height={height}
        label={label}
        unit={unit}
        formatValue={(n) => formatByMode(n, format)}
      />
    </ChartFrame>
  );
}
