import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  DropIcon,
  HeartbeatIcon,
  MoonIcon,
  PulseIcon,
  ScalesIcon,
} from "@phosphor-icons/react/dist/ssr";

import { MetricTrend } from "@/components/health/metric-trend";
import { QuickLog } from "@/components/health/quick-log";
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
import { getDashboardUserId } from "@/lib/auth-user";
import { CHART_HEIGHT } from "@/lib/chart-theme";
import { formatDuration, formatKg, formatShortDate, todayIso } from "@/lib/format";
import { loadMetricSeries, loadSleepHistory } from "@/lib/health-log";
import { loadHabitsDashboard } from "@/lib/habits";
import { safely } from "@/lib/safe-query";
import type { MetricPoint } from "@/lib/health-log";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Health" };

function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return todayIso(d);
}

export default async function HealthPage() {
  const userId = await getDashboardUserId();
  if (!userId) redirect("/sign-in");

  const from = daysAgo(120);

  const [data, sleepRows, water, restingHr, mood] = await Promise.all([
    loadHabitsDashboard(userId),
    safely(() => loadSleepHistory({ userId, from, limit: 120 }), [], "sleep history"),
    safely(
      () => loadMetricSeries({ userId, metric: "water_ml", from }),
      [] as MetricPoint[],
      "water history",
    ),
    safely(
      () => loadMetricSeries({ userId, metric: "heart_rate_resting", from }),
      [] as MetricPoint[],
      "hr history",
    ),
    safely(
      () => loadMetricSeries({ userId, metric: "mood", from }),
      [] as MetricPoint[],
      "mood history",
    ),
  ]);

  const sleepPoints: MetricPoint[] = sleepRows
    .map((row) => ({
      date: row.date,
      value: row.totalMinutes / 60,
      unit: "hr",
      source: row.source,
    }))
    .reverse();

  const latestSleep = sleepRows[0] ?? null;
  const latestWater = water.at(-1) ?? null;
  const latestHr = restingHr.at(-1) ?? null;
  const historyWeights = data.weights;
  const listedWeights = [...data.weights].reverse();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Health"
        description="Log readings and watch trends — weight, sleep, water, heart, mood."
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
          label="Sleep"
          value={
            latestSleep ? formatDuration(latestSleep.totalMinutes) : null
          }
          icon={MoonIcon}
          footnote={
            latestSleep
              ? `${formatShortDate(latestSleep.date)}${
                  latestSleep.quality ? ` · Q${latestSleep.quality}` : ""
                }`
              : undefined
          }
        />
        <MetricCard
          label="Water"
          value={latestWater ? (latestWater.value / 1000).toFixed(1) : null}
          unit="L"
          icon={DropIcon}
          footnote={
            latestWater ? formatShortDate(latestWater.date) : undefined
          }
        />
        <MetricCard
          label="Resting HR"
          value={latestHr ? Math.round(latestHr.value) : null}
          unit="bpm"
          icon={HeartbeatIcon}
          footnote={latestHr ? formatShortDate(latestHr.date) : undefined}
        />
      </div>

      <Panel>
        <PanelHeader>
          <div className="min-w-0">
            <PanelTitle>Log a reading</PanelTitle>
            <PanelDescription>
              Manual entries write to the same tables connected sources use.
            </PanelDescription>
          </div>
        </PanelHeader>
        <PanelBody>
          <QuickLog
            defaults={{
              weightKg: data.latestWeight?.kg ?? null,
              waterMl: latestWater?.value ?? null,
              restingHeartRate: latestHr?.value ?? null,
              sleepMinutes: latestSleep?.totalMinutes ?? null,
              mood: mood.at(-1)?.value ?? null,
            }}
          />
        </PanelBody>
      </Panel>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Panel>
          <PanelHeader>
            <div className="min-w-0">
              <PanelTitle>Weight</PanelTitle>
              <PanelDescription>
                {historyWeights.length > 1
                  ? `${formatShortDate(historyWeights[0].date)} – ${formatShortDate(historyWeights[historyWeights.length - 1].date)}`
                  : "Body weight"}
              </PanelDescription>
            </div>
          </PanelHeader>
          <PanelBody>
            <WeightTrend points={historyWeights} height={CHART_HEIGHT.default} />
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader>
            <div className="min-w-0">
              <PanelTitle>Sleep</PanelTitle>
              <PanelDescription>Hours per night</PanelDescription>
            </div>
          </PanelHeader>
          <PanelBody>
            <MetricTrend
              points={sleepPoints}
              label="Sleep"
              unit="hr"
              formatValue={(n) => n.toFixed(1)}
            />
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader>
            <div className="min-w-0">
              <PanelTitle>Water</PanelTitle>
              <PanelDescription>Daily intake</PanelDescription>
            </div>
          </PanelHeader>
          <PanelBody>
            <MetricTrend
              points={water.map((p) => ({
                ...p,
                value: p.value / 1000,
              }))}
              label="Water"
              unit="L"
              formatValue={(n) => n.toFixed(1)}
            />
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader>
            <div className="min-w-0">
              <PanelTitle>Resting heart rate</PanelTitle>
              <PanelDescription>bpm over time</PanelDescription>
            </div>
          </PanelHeader>
          <PanelBody>
            <MetricTrend points={restingHr} label="Resting HR" unit="bpm" />
          </PanelBody>
        </Panel>
      </div>

      {mood.length > 0 ? (
        <Panel>
          <PanelHeader>
            <div className="min-w-0">
              <PanelTitle>Mood</PanelTitle>
              <PanelDescription>1–5 self-report</PanelDescription>
            </div>
          </PanelHeader>
          <PanelBody>
            <MetricTrend
              points={mood}
              label="Mood"
              height={CHART_HEIGHT.compact}
            />
          </PanelBody>
        </Panel>
      ) : null}

      <Panel>
        <PanelHeader>
          <div className="min-w-0">
            <PanelTitle>Weight readings</PanelTitle>
            <PanelDescription>
              {listedWeights.length === 0
                ? "Every weigh-in"
                : `${listedWeights.length} readings`}
            </PanelDescription>
          </div>
        </PanelHeader>
        <PanelBody flush>
          {listedWeights.length === 0 ? (
            <EmptyState
              icon={ScalesIcon}
              title="No weigh-ins yet"
              description="Log weight from Today or the form above."
            />
          ) : (
            <ul className="max-h-[36rem] divide-y divide-line overflow-auto">
              {listedWeights.map((point) => (
                <li
                  key={point.date}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                >
                  <span className="text-sm text-text">
                    {formatShortDate(point.date)}
                  </span>
                  <span className="num shrink-0 text-sm text-text-muted">
                    {formatKg(point.kg)} kg
                  </span>
                </li>
              ))}
            </ul>
          )}
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader>
          <PanelTitle>Sleep nights</PanelTitle>
        </PanelHeader>
        <PanelBody flush>
          {sleepRows.length === 0 ? (
            <EmptyState
              icon={PulseIcon}
              title="No sleep logged"
              description="Log last night from Today — hours, minutes, and quality."
            />
          ) : (
            <ul className="max-h-[24rem] divide-y divide-line overflow-auto">
              {sleepRows.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                >
                  <span className="text-sm text-text">
                    {formatShortDate(row.date)}
                  </span>
                  <span className="num shrink-0 text-sm text-text-muted">
                    {formatDuration(row.totalMinutes)}
                    {row.quality != null ? ` · Q${row.quality}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </PanelBody>
      </Panel>
    </div>
  );
}
