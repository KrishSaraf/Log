"use client";

import { ChartFrame } from "@/components/kit";
import { SimpleLineChart } from "@/components/kit/simple-charts";
import { CHART_HEIGHT } from "@/lib/chart-theme";
import { formatKg } from "@/lib/format";
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
        emptyLabel="Weight readings will plot here — log a weigh-in above"
        emptyAction={
          <a
            href="#quick-log"
            className="inline-flex min-h-10 items-center rounded-lg border border-lime-line bg-lime-quiet px-3 text-sm font-medium text-lime transition-opacity hover:opacity-90"
          >
            Log weight
          </a>
        }
      />
    );
  }

  return (
    <ChartFrame height={height} caption="Kilograms">
      <SimpleLineChart
        points={points.map((p) => ({ date: p.date, value: p.kg }))}
        height={height}
        label="Weight"
        unit="kg"
        formatValue={(n) => formatKg(n)}
      />
    </ChartFrame>
  );
}
