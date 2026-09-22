import { and, asc, desc, eq, gte, lte } from "drizzle-orm";

import {
  db,
  healthMetrics,
  sleepSessions,
  type HealthMetricKey,
  type Source,
} from "@/db";
import { todayIso, toNumber } from "@/lib/format";

export const METRIC_UNITS: Partial<Record<string, string>> = {
  weight_kg: "kg",
  water_ml: "ml",
  heart_rate_resting: "bpm",
  heart_rate_avg: "bpm",
  heart_rate_max: "bpm",
  blood_pressure_systolic: "mmHg",
  blood_pressure_diastolic: "mmHg",
  sleep_minutes: "min",
  active_calories: "kcal",
  exercise_minutes: "min",
  stand_hours: "hr",
  steps: "steps",
  mood: "1-5",
  energy: "1-5",
  body_fat_pct: "%",
  waist_cm: "cm",
  lean_mass_kg: "kg",
};

export type MetricPoint = {
  date: string;
  value: number;
  unit: string | null;
  source: string;
};

export async function upsertHealthMetric(input: {
  userId: string;
  date: string;
  metric: HealthMetricKey | string;
  value: number;
  unit?: string | null;
  source?: Source;
}) {
  const source = input.source ?? "manual";
  const unit = input.unit ?? METRIC_UNITS[input.metric] ?? null;

  const [row] = await db
    .insert(healthMetrics)
    .values({
      userId: input.userId,
      date: input.date,
      metric: input.metric,
      value: String(input.value),
      unit,
      source,
      recordedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        healthMetrics.userId,
        healthMetrics.date,
        healthMetrics.metric,
        healthMetrics.source,
      ],
      set: {
        value: String(input.value),
        unit,
        recordedAt: new Date(),
      },
    })
    .returning({
      id: healthMetrics.id,
      date: healthMetrics.date,
      metric: healthMetrics.metric,
      value: healthMetrics.value,
      unit: healthMetrics.unit,
      source: healthMetrics.source,
    });

  return {
    id: row.id,
    date: row.date,
    metric: row.metric,
    value: toNumber(row.value),
    unit: row.unit,
    source: row.source,
  };
}

export async function loadMetricSeries(input: {
  userId: string;
  metric: string;
  from?: string;
  to?: string;
  limit?: number;
}): Promise<MetricPoint[]> {
  const clauses = [
    eq(healthMetrics.userId, input.userId),
    eq(healthMetrics.metric, input.metric),
  ];
  if (input.from) clauses.push(gte(healthMetrics.date, input.from));
  if (input.to) clauses.push(lte(healthMetrics.date, input.to));

  const rows = await db
    .select({
      date: healthMetrics.date,
      value: healthMetrics.value,
      unit: healthMetrics.unit,
      source: healthMetrics.source,
    })
    .from(healthMetrics)
    .where(and(...clauses))
    .orderBy(asc(healthMetrics.date))
    .limit(input.limit ?? 366);

  // Prefer apple_health over manual when both exist for a day.
  const preferred = ["apple_health", "health_connect", "google_fit", "manual", "import"];
  const best = new Map<string, MetricPoint>();
  for (const row of rows) {
    const value = toNumber(row.value);
    if (value === null) continue;
    const point: MetricPoint = {
      date: row.date,
      value,
      unit: row.unit,
      source: row.source,
    };
    const existing = best.get(row.date);
    if (
      !existing ||
      preferred.indexOf(row.source) < preferred.indexOf(existing.source)
    ) {
      best.set(row.date, point);
    }
  }
  return [...best.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function parseIsoDate(value: unknown, fallback = todayIso()) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  return fallback;
}

export async function upsertSleepSession(input: {
  userId: string;
  date: string;
  totalMinutes: number;
  startedAt?: Date | null;
  endedAt?: Date | null;
  quality?: number | null;
  deepMinutes?: number | null;
  remMinutes?: number | null;
  lightMinutes?: number | null;
  awakeMinutes?: number | null;
  notes?: string | null;
  source?: Source;
}) {
  const source = input.source ?? "manual";
  const quality =
    input.quality != null
      ? Math.min(5, Math.max(1, Math.round(input.quality)))
      : null;

  const [row] = await db
    .insert(sleepSessions)
    .values({
      userId: input.userId,
      date: input.date,
      totalMinutes: Math.round(input.totalMinutes),
      startedAt: input.startedAt ?? null,
      endedAt: input.endedAt ?? null,
      quality,
      deepMinutes: input.deepMinutes ?? null,
      remMinutes: input.remMinutes ?? null,
      lightMinutes: input.lightMinutes ?? null,
      awakeMinutes: input.awakeMinutes ?? null,
      notes: input.notes ?? null,
      source,
    })
    .onConflictDoUpdate({
      target: [
        sleepSessions.userId,
        sleepSessions.date,
        sleepSessions.source,
      ],
      set: {
        totalMinutes: Math.round(input.totalMinutes),
        startedAt: input.startedAt ?? null,
        endedAt: input.endedAt ?? null,
        quality,
        deepMinutes: input.deepMinutes ?? null,
        remMinutes: input.remMinutes ?? null,
        lightMinutes: input.lightMinutes ?? null,
        awakeMinutes: input.awakeMinutes ?? null,
        notes: input.notes ?? null,
      },
    })
    .returning();

  // Mirror total into health_metrics so Today rings/stats stay simple.
  await upsertHealthMetric({
    userId: input.userId,
    date: input.date,
    metric: "sleep_minutes",
    value: row.totalMinutes,
    unit: "min",
    source,
  });

  return row;
}

export async function loadSleepHistory(input: {
  userId: string;
  from?: string;
  limit?: number;
}) {
  const clauses = [eq(sleepSessions.userId, input.userId)];
  if (input.from) clauses.push(gte(sleepSessions.date, input.from));

  return db
    .select()
    .from(sleepSessions)
    .where(and(...clauses))
    .orderBy(desc(sleepSessions.date))
    .limit(input.limit ?? 60);
}
