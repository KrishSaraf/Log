import { and, desc, eq, gte, inArray } from "drizzle-orm";

import {
  connectedSources,
  db,
  healthMetrics,
  sleepSessions,
  workouts,
  type ConnectionProvider,
  type ConnectionStatus,
} from "@/db";
import type { NutritionSummary } from "@/lib/nutrition";
import { loadNutritionSummary } from "@/lib/nutrition";
import { todayIso, toNumber } from "@/lib/format";
import { safely } from "@/lib/safe-query";

export type TodayMetricMap = {
  steps: number | null;
  activeCalories: number | null;
  exerciseMinutes: number | null;
  standHours: number | null;
  sleepMinutes: number | null;
  restingHeartRate: number | null;
  weightKg: number | null;
  waterMl: number | null;
  mood: number | null;
  energy: number | null;
  bpSystolic: number | null;
  bpDiastolic: number | null;
};

export type TodayActivityItem = {
  id: string;
  kind: "workout" | "meal" | "sleep";
  title: string;
  subtitle: string | null;
  date: string;
};

export type TodayConnection = {
  provider: ConnectionProvider;
  status: ConnectionStatus;
  displayName: string | null;
  lastSyncAt: string | null;
};

export type TodaySummary = {
  date: string;
  metrics: TodayMetricMap;
  /** Ring progress 0..1 against soft daily goals. */
  rings: {
    move: number;
    exercise: number;
    stand: number;
  };
  nutrition: NutritionSummary;
  recent: TodayActivityItem[];
  connections: TodayConnection[];
  connectedCount: number;
};

const RING_GOALS = {
  activeCalories: 500,
  exerciseMinutes: 30,
  standHours: 12,
} as const;

const EMPTY_METRICS: TodayMetricMap = {
  steps: null,
  activeCalories: null,
  exerciseMinutes: null,
  standHours: null,
  sleepMinutes: null,
  restingHeartRate: null,
  weightKg: null,
  waterMl: null,
  mood: null,
  energy: null,
  bpSystolic: null,
  bpDiastolic: null,
};

const METRIC_KEYS = [
  "steps",
  "active_calories",
  "exercise_minutes",
  "stand_hours",
  "sleep_minutes",
  "heart_rate_resting",
  "weight_kg",
  "water_ml",
  "mood",
  "energy",
  "blood_pressure_systolic",
  "blood_pressure_diastolic",
] as const;

function ringProgress(value: number | null, goal: number) {
  if (value === null || goal <= 0) return 0;
  return Math.min(1, value / goal);
}

function daysAgoIso(days: number, now = new Date()) {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return todayIso(d);
}

/** Prefer the richest source for a day when several wrote the same metric. */
function pickMetric(
  rows: { metric: string; value: string; source: string }[],
  key: string,
): number | null {
  const matches = rows.filter((r) => r.metric === key);
  if (matches.length === 0) return null;
  const preferred = ["apple_health", "health_connect", "google_fit", "manual", "import"];
  matches.sort(
    (a, b) =>
      preferred.indexOf(a.source) - preferred.indexOf(b.source) ||
      Number(b.value) - Number(a.value),
  );
  return toNumber(matches[0]?.value);
}

export async function loadTodaySummary(userId: string): Promise<TodaySummary> {
  const date = todayIso();
  const recentFrom = daysAgoIso(14);

  const [
    metricRows,
    recentWorkouts,
    recentSleep,
    connections,
    nutrition,
  ] = await Promise.all([
      safely(
        () =>
          db
            .select({
              metric: healthMetrics.metric,
              value: healthMetrics.value,
              source: healthMetrics.source,
            })
            .from(healthMetrics)
            .where(
              and(
                eq(healthMetrics.userId, userId),
                eq(healthMetrics.date, date),
                inArray(healthMetrics.metric, [...METRIC_KEYS]),
              ),
            ),
        [] as { metric: string; value: string; source: string }[],
        "today metrics",
      ),
      safely(
        () =>
          db
            .select({
              id: workouts.id,
              date: workouts.date,
              name: workouts.name,
              notes: workouts.notes,
            })
            .from(workouts)
            .where(
              and(eq(workouts.userId, userId), gte(workouts.date, recentFrom)),
            )
            .orderBy(desc(workouts.date))
            .limit(5),
        [] as {
          id: string;
          date: string;
          name: string | null;
          notes: string | null;
        }[],
        "today workouts",
      ),
      safely(
        () =>
          db
            .select({
              id: sleepSessions.id,
              date: sleepSessions.date,
              totalMinutes: sleepSessions.totalMinutes,
            })
            .from(sleepSessions)
            .where(
              and(
                eq(sleepSessions.userId, userId),
                gte(sleepSessions.date, recentFrom),
              ),
            )
            .orderBy(desc(sleepSessions.date))
            .limit(3),
        [] as { id: string; date: string; totalMinutes: number }[],
        "today sleep",
      ),
      safely(
        () =>
          db
            .select({
              provider: connectedSources.provider,
              status: connectedSources.status,
              displayName: connectedSources.displayName,
              lastSyncAt: connectedSources.lastSyncAt,
            })
            .from(connectedSources)
            .where(eq(connectedSources.userId, userId)),
        [] as {
          provider: ConnectionProvider;
          status: ConnectionStatus;
          displayName: string | null;
          lastSyncAt: Date | null;
        }[],
        "today connections",
      ),
      loadNutritionSummary(userId, { recentLimit: 8 }),
    ]);

  const metrics: TodayMetricMap = {
    steps: pickMetric(metricRows, "steps"),
    activeCalories: pickMetric(metricRows, "active_calories"),
    exerciseMinutes: pickMetric(metricRows, "exercise_minutes"),
    standHours: pickMetric(metricRows, "stand_hours"),
    sleepMinutes: pickMetric(metricRows, "sleep_minutes"),
    restingHeartRate: pickMetric(metricRows, "heart_rate_resting"),
    weightKg: pickMetric(metricRows, "weight_kg"),
    waterMl: pickMetric(metricRows, "water_ml"),
    mood: pickMetric(metricRows, "mood"),
    energy: pickMetric(metricRows, "energy"),
    bpSystolic: pickMetric(metricRows, "blood_pressure_systolic"),
    bpDiastolic: pickMetric(metricRows, "blood_pressure_diastolic"),
  };

  // If sleep table has tonight and metrics do not, surface the session total.
  if (metrics.sleepMinutes === null) {
    const tonight = recentSleep.find((s) => s.date === date);
    if (tonight) metrics.sleepMinutes = tonight.totalMinutes;
  }

  const recent: TodayActivityItem[] = [
    ...recentWorkouts.map((w) => ({
      id: `workout:${w.id}`,
      kind: "workout" as const,
      title: w.name?.trim() || "Workout",
      subtitle: w.notes,
      date: w.date,
    })),
    ...nutrition.recent.slice(0, 5).map((m) => ({
      id: `meal:${m.id}`,
      kind: "meal" as const,
      title: m.name?.trim() || m.mealType,
      subtitle:
        m.calories > 0
          ? `${Math.round(m.calories)} kcal${
              m.protein > 0 ? ` · P ${Math.round(m.protein)}g` : ""
            }`
          : null,
      date: m.date,
    })),
    ...recentSleep.map((s) => ({
      id: `sleep:${s.id}`,
      kind: "sleep" as const,
      title: "Sleep",
      subtitle: `${Math.round(s.totalMinutes / 60)}h ${s.totalMinutes % 60}m`,
      date: s.date,
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8);

  const connectionRows: TodayConnection[] = connections.map((c) => ({
    provider: c.provider,
    status: c.status,
    displayName: c.displayName,
    lastSyncAt: c.lastSyncAt ? c.lastSyncAt.toISOString() : null,
  }));

  return {
    date,
    metrics: { ...EMPTY_METRICS, ...metrics },
    rings: {
      move: ringProgress(metrics.activeCalories, RING_GOALS.activeCalories),
      exercise: ringProgress(metrics.exerciseMinutes, RING_GOALS.exerciseMinutes),
      stand: ringProgress(metrics.standHours, RING_GOALS.standHours),
    },
    nutrition,
    recent,
    connections: connectionRows,
    connectedCount: connectionRows.filter((c) => c.status === "connected").length,
  };
}
