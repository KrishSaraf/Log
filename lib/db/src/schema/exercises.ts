import {
  pgTable,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Exercise library — demo media via gifUrl + images[],
 * primary target + secondaryMuscles, equipment, bodyPart filters.
 */
export const exercisesTable = pgTable(
  "exercises",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    bodyPart: text("body_part").notNull(),
    equipment: text("equipment").notNull(),
    gifUrl: text("gif_url").notNull().default(""),
    target: text("target").notNull(),
    secondaryMuscles: text("secondary_muscles").array().notNull().default([]),
    instructions: text("instructions").array().notNull().default([]),
    images: text("images").array().notNull().default([]),
    level: text("level").notNull().default("beginner"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("exercises_name_idx").on(t.name),
    index("exercises_body_part_idx").on(t.bodyPart),
    index("exercises_equipment_idx").on(t.equipment),
    index("exercises_target_idx").on(t.target),
    index("exercises_level_idx").on(t.level),
  ],
);

export const insertExerciseSchema = createInsertSchema(exercisesTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertExercise = z.infer<typeof insertExerciseSchema>;
export type Exercise = typeof exercisesTable.$inferSelect;
