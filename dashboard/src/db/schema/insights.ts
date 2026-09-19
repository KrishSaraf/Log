import { date, index, jsonb, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "./auth";
import { hub } from "./_shared";

export type InsightData = Record<string, unknown>;

export const insights = hub.table(
  "insights",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    kind: text("kind").notNull().default("summary"),
    data: jsonb("data").$type<InsightData>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("insights_user_date_idx").on(t.userId, t.date)],
);

export type Insight = typeof insights.$inferSelect;
export type NewInsight = typeof insights.$inferInsert;
