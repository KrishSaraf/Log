import { pgTable, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const exercisesTable = pgTable("exercises", {
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

export const insertExerciseSchema = createInsertSchema(exercisesTable);
export type InsertExercise = z.infer<typeof insertExerciseSchema>;
export type Exercise = typeof exercisesTable.$inferSelect;
