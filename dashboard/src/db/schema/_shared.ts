import { pgSchema } from "drizzle-orm/pg-core";

/**
 * Every table this app owns lives in the `hub` Postgres schema.
 * `public` is left alone so the existing exercise library is never touched by
 * `drizzle-kit push` (see drizzle.config.ts `schemaFilter`).
 */
export const hub = pgSchema("hub");

/**
 * Where a row came from. Applies to workouts, meals, health metrics, sleep.
 * Keep this set stable — expanding a live Postgres enum is a separate migration.
 * New platforms are tracked on `connected_sources.provider` instead.
 */
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

/** Known external platforms that can sync into Log. */
export const connectionProviderEnum = hub.enum("connection_provider", [
  "apple_health",
  "health_connect",
  "google_fit",
  "manual_import",
]);

export const connectionStatusEnum = hub.enum("connection_status", [
  "disconnected",
  "pending",
  "connected",
  "error",
]);

export type Source = (typeof sourceEnum.enumValues)[number];
export type MealType = (typeof mealTypeEnum.enumValues)[number];
export type QuestionType = (typeof questionTypeEnum.enumValues)[number];
export type Cadence = (typeof cadenceEnum.enumValues)[number];
export type ConnectionProvider =
  (typeof connectionProviderEnum.enumValues)[number];
export type ConnectionStatus =
  (typeof connectionStatusEnum.enumValues)[number];
