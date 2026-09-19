import { date, index, jsonb, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { hub } from "./_shared";

/** Free-form payload an insight can attach for its own renderer. */
export type InsightData = Record<string, unknown>;

/**
 * A generated observation about a day or period. `kind` is open text so new
 * generators can be added without a migration. Known kinds so far:
 * "summary", "trend", "anomaly", "suggestion", "streak".
 */
export const insights = hub.table(
  "insights",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    date: date("date").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    kind: text("kind").notNull().default("summary"),
    data: jsonb("data").$type<InsightData>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("insights_date_idx").on(t.date)],
);

export type Insight = typeof insights.$inferSelect;
export type NewInsight = typeof insights.$inferInsert;
