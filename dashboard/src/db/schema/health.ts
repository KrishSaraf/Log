import { date, index, numeric, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { hub, sourceEnum } from "./_shared";

/**
 * The canonical metric keys. `metric` is a plain text column so new keys can
 * be added by an importer without a migration. Stick to this vocabulary where
 * it fits, and use snake_case for anything new.
 */
export const HEALTH_METRICS = [
  "steps",
  "active_calories",
  "resting_calories",
  "exercise_minutes",
  "stand_hours",
  "heart_rate_resting",
  "heart_rate_avg",
  "heart_rate_max",
  "hrv_ms",
  "vo2_max",
  "sleep_minutes",
  "sleep_deep_minutes",
  "sleep_rem_minutes",
  "respiratory_rate",
  "blood_oxygen",
  "weight_kg",
  "body_fat_pct",
  "lean_mass_kg",
  "waist_cm",
  "distance_m",
  "flights_climbed",
] as const;

export type HealthMetricKey = (typeof HEALTH_METRICS)[number] | (string & {});

/**
 * One value for one metric on one day, per source. The unique index lets
 * importers upsert idempotently while still allowing a manual reading and an
 * Apple Health reading of the same metric to coexist on the same day.
 */
export const healthMetrics = hub.table(
  "health_metrics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    date: date("date").notNull(),
    metric: text("metric").$type<HealthMetricKey>().notNull(),
    value: numeric("value", { precision: 14, scale: 4 }).notNull(),
    unit: text("unit"),
    source: sourceEnum("source").notNull().default("manual"),
    recordedAt: timestamp("recorded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("health_metrics_day_metric_source_uq").on(
      t.date,
      t.metric,
      t.source,
    ),
    index("health_metrics_metric_date_idx").on(t.metric, t.date),
  ],
);

export type HealthMetric = typeof healthMetrics.$inferSelect;
export type NewHealthMetric = typeof healthMetrics.$inferInsert;
