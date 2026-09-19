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
import { formatKg, formatShortDate } from "@/lib/format";
import type { WeightPoint } from "@/lib/habits";

export function WeightTrend({
  points,
  height = CHART_HEIGHT.default,
}: {
  points: WeightPoint[];
  height?: number;
}) {
  if (points.length === 0) {
    return (
      <ChartFrame
        isEmpty
        height={height}
        emptyLabel="Weight readings will plot here"
      />
    );
  }

  const values = points.map((point) => point.kg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max(0.6, (max - min) * 0.12);

  return (
    <ChartFrame height={height} caption="Kilograms">
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
          tickFormatter={(value: number) => formatKg(value)}
        />
        <Tooltip
          {...tooltipProps}
          labelFormatter={(value) => formatShortDate(String(value))}
          formatter={(value) => [`${formatKg(Number(value))} kg`, "Weight"]}
        />
        <Line
          type="monotone"
          dataKey="kg"
          stroke={CHART_COLORS.ember}
          strokeWidth={1.75}
          dot={false}
          activeDot={{ r: 3, fill: CHART_COLORS.ember, stroke: "none" }}
        />
      </LineChart>
    </ChartFrame>
  );
}
