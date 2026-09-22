import {
  date,
  index,
  numeric,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./auth";
import { hub, sourceEnum } from "./_shared";

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
  /** Manual / connected daily totals */
  "water_ml",
  "blood_pressure_systolic",
  "blood_pressure_diastolic",
  /** 1–5 self-report scales */
  "mood",
  "energy",
] as const;

export type HealthMetricKey = (typeof HEALTH_METRICS)[number] | (string & {});

export const healthMetrics = hub.table(
  "health_metrics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
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
    uniqueIndex("health_metrics_user_day_metric_source_uq").on(
      t.userId,
      t.date,
      t.metric,
      t.source,
    ),
    index("health_metrics_user_metric_date_idx").on(t.userId, t.metric, t.date),
  ],
);

export type HealthMetric = typeof healthMetrics.$inferSelect;
export type NewHealthMetric = typeof healthMetrics.$inferInsert;
