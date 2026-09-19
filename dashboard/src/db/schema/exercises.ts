import { pgTable, text } from "drizzle-orm/pg-core";

/**
 * Read-only mapping of the pre-existing `public.exercises` library (876 rows)
 * that is shared with the Vite exercise app. Excluded from `drizzle-kit push`
 * by `schemaFilter`, so it can never be recreated, altered or dropped here.
 */
export const exercises = pgTable("exercises", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  bodyPart: text("body_part").notNull(),
  equipment: text("equipment").notNull(),
  gifUrl: text("gif_url").notNull(),
  target: text("target").notNull(),
  secondaryMuscles: text("secondary_muscles").array().notNull().default([]),
  instructions: text("instructions").array().notNull().default([]),
  images: text("images").array().notNull().default([]),
  level: text("level").notNull().default("beginner"),
});

export type Exercise = typeof exercises.$inferSelect;
