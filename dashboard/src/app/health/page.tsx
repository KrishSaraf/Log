import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HeartbeatIcon, PulseIcon, ScalesIcon } from "@phosphor-icons/react/dist/ssr";
import { count, desc, eq, max, sql } from "drizzle-orm";

import { auth } from "@/auth";
import { WeightTrend } from "@/components/health/weight-trend";
import {
  EmptyState,
  MetricCard,
  PageHeader,
  Panel,
  PanelBody,
  PanelDescription,
  PanelHeader,
  PanelTitle,
} from "@/components/kit";
import { db, healthMetrics } from "@/db";
import { CHART_HEIGHT } from "@/lib/chart-theme";
import { formatKg, formatShortDate } from "@/lib/format";
import { loadHabitsDashboard } from "@/lib/habits";
import { safely } from "@/lib/safe-query";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Health" };

const METRIC_LABELS: Record<string, string> = {
  weight_kg: "Weight",
};

export default async function HealthPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");
  const userId = session.user.id;

  const [data, coverage] = await Promise.all([
    loadHabitsDashboard(userId),
    safely(
      () =>
        db
          .select({
            metric: healthMetrics.metric,
            readings: count(),
            latest: max(healthMetrics.date),
          })
          .from(healthMetrics)
          .where(eq(healthMetrics.userId, userId))
          .groupBy(healthMetrics.metric)
          .orderBy(desc(sql`count(*)`)),
      [] as { metric: string; readings: number; latest: string | null }[],
      "health metric coverage",
    ),
  ]);

  const historyWeights = data.weights.filter((point) => point.date.startsWith("2024"));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Health"
        description="Body readings over time."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard
          label="Weight"
          value={data.latestWeight ? formatKg(data.latestWeight.kg) : null}
          unit="kg"
          icon={ScalesIcon}
          footnote={
            data.latestWeight
              ? formatShortDate(data.latestWeight.date)
              : undefined
          }
        />
        <MetricCard
          label="Resting heart rate"
          value={null}
          unit="bpm"
          icon={HeartbeatIcon}
        />
        <MetricCard label="Sleep, 7-day average" value={null} />
        <MetricCard label="Steps, 7-day average" value={null} icon={PulseIcon} />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <Panel className="lg:col-span-7">
          <PanelHeader>
            <div className="min-w-0">
              <PanelTitle>Trend</PanelTitle>
              <PanelDescription>
                {historyWeights.length > 1
                  ? `${formatShortDate(historyWeights[0].date)} – ${formatShortDate(historyWeights[historyWeights.length - 1].date)}`
                  : "Weight"}
              </PanelDescription>
            </div>
          </PanelHeader>
          <PanelBody>
            <WeightTrend points={historyWeights} height={CHART_HEIGHT.default} />
          </PanelBody>
        </Panel>

        <Panel className="lg:col-span-5">
          <PanelHeader>
            <PanelTitle>Metrics on record</PanelTitle>
          </PanelHeader>
          <PanelBody flush>
            {coverage.length === 0 ? (
              <EmptyState
                icon={PulseIcon}
                title="No readings yet"
                description="Each metric that has data will be listed here with how many readings it has and when it was last updated."
              />
            ) : (
              <ul className="divide-y divide-line">
                {coverage.map((row) => (
                  <li
                    key={row.metric}
                    className="flex items-center justify-between gap-3 px-4 py-2.5"
                  >
                    <span className="truncate text-sm text-text">
                      {METRIC_LABELS[row.metric] ?? row.metric.replaceAll("_", " ")}
                    </span>
                    <span className="num shrink-0 text-xs text-text-muted">
                      {row.readings}
                      {row.latest ? ` · ${formatShortDate(row.latest)}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </PanelBody>
        </Panel>
      </div>
    </div>
  );
}
