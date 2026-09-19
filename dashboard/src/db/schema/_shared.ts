import { pgSchema } from "drizzle-orm/pg-core";

/**
 * Every table this app owns lives in the `hub` Postgres schema.
 * `public` is left alone so the existing exercise library is never touched by
 * `drizzle-kit push` (see drizzle.config.ts `schemaFilter`).
 */
export const hub = pgSchema("hub");

/** Where a row came from. Applies to workouts, meals and health metrics. */
export const sourceEnum = hub.enum("source", [
  "manual",
  "photo",
  "import",
  "apple_health",
]);

export const mealTypeEnum = hub.enum("meal_type", [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
]);

export const questionTypeEnum = hub.enum("question_type", [
  "rating",
  "boolean",
  "multiple_choice",
  "text",
  "number",
]);

export const cadenceEnum = hub.enum("cadence", ["daily", "weekly"]);

export type Source = (typeof sourceEnum.enumValues)[number];
export type MealType = (typeof mealTypeEnum.enumValues)[number];
export type QuestionType = (typeof questionTypeEnum.enumValues)[number];
export type Cadence = (typeof cadenceEnum.enumValues)[number];
