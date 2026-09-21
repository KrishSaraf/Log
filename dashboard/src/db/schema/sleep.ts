import {
  date,
  index,
  integer,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./auth";
import { hub, sourceEnum } from "./_shared";

/**
 * Nightly sleep sessions. Stage minutes are nullable so a source that only
 * reports total sleep still fits. Daily totals can also land in
 * `health_metrics` (`sleep_minutes`, …); this table keeps the session record.
 */
export const sleepSessions = hub.table(
  "sleep_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Calendar night the sleep is attributed to (wake date, local). */
    date: date("date").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    totalMinutes: integer("total_minutes").notNull(),
    deepMinutes: integer("deep_minutes"),
    remMinutes: integer("rem_minutes"),
    lightMinutes: integer("light_minutes"),
    awakeMinutes: integer("awake_minutes"),
    /** Subjective quality, 1 (poor) – 5 (great). */
    quality: integer("quality"),
    source: sourceEnum("source").notNull().default("manual"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("sleep_sessions_user_day_source_uq").on(
      t.userId,
      t.date,
      t.source,
    ),
    index("sleep_sessions_user_date_idx").on(t.userId, t.date),
  ],
);

export type SleepSession = typeof sleepSessions.$inferSelect;
export type NewSleepSession = typeof sleepSessions.$inferInsert;
