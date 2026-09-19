import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  numeric,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { hub, sourceEnum } from "./_shared";
import { exercises } from "./exercises";

/** One training session on one calendar day. */
export const workouts = hub.table(
  "workouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    date: date("date").notNull(),
    name: text("name"),
    notes: text("notes"),
    durationMinutes: integer("duration_minutes"),
    source: sourceEnum("source").notNull().default("manual"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("workouts_date_idx").on(t.date),
    uniqueIndex("workouts_day_name_source_uq").on(t.date, t.name, t.source),
  ],
);

/**
 * An exercise slot inside a workout. `exerciseId` points at the shared
 * library; when it is null the slot is a one-off and `customName` carries the
 * label. Exactly one of the two should be set.
 */
export const workoutExercises = hub.table(
  "workout_exercises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workoutId: uuid("workout_id")
      .notNull()
      .references(() => workouts.id, { onDelete: "cascade" }),
    exerciseId: text("exercise_id").references(() => exercises.id, {
      onDelete: "set null",
    }),
    customName: text("custom_name"),
    orderIndex: integer("order_index").notNull().default(0),
    notes: text("notes"),
  },
  (t) => [
    index("workout_exercises_workout_idx").on(t.workoutId),
    uniqueIndex("workout_exercises_order_uq").on(t.workoutId, t.orderIndex),
  ],
);

/**
 * A single set. Which numeric columns are populated depends on the movement:
 * lifting uses reps + weightKg, cardio uses durationSeconds + distanceM,
 * bodyweight holds use durationSeconds alone.
 */
export const workoutSets = hub.table(
  "workout_sets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workoutExerciseId: uuid("workout_exercise_id")
      .notNull()
      .references(() => workoutExercises.id, { onDelete: "cascade" }),
    setIndex: integer("set_index").notNull().default(0),
    reps: integer("reps"),
    weightKg: numeric("weight_kg", { precision: 7, scale: 2 }),
    durationSeconds: integer("duration_seconds"),
    distanceM: numeric("distance_m", { precision: 10, scale: 2 }),
    rpe: numeric("rpe", { precision: 3, scale: 1 }),
    isWarmup: boolean("is_warmup").notNull().default(false),
    completed: boolean("completed").notNull().default(true),
  },
  (t) => [
    index("workout_sets_exercise_idx").on(t.workoutExerciseId),
    uniqueIndex("workout_sets_order_uq").on(t.workoutExerciseId, t.setIndex),
  ],
);

export const workoutsRelations = relations(workouts, ({ many }) => ({
  exercises: many(workoutExercises),
}));

export const workoutExercisesRelations = relations(
  workoutExercises,
  ({ one, many }) => ({
    workout: one(workouts, {
      fields: [workoutExercises.workoutId],
      references: [workouts.id],
    }),
    exercise: one(exercises, {
      fields: [workoutExercises.exerciseId],
      references: [exercises.id],
    }),
    sets: many(workoutSets),
  }),
);

export const workoutSetsRelations = relations(workoutSets, ({ one }) => ({
  workoutExercise: one(workoutExercises, {
    fields: [workoutSets.workoutExerciseId],
    references: [workoutExercises.id],
  }),
}));

export type Workout = typeof workouts.$inferSelect;
export type NewWorkout = typeof workouts.$inferInsert;
export type WorkoutExercise = typeof workoutExercises.$inferSelect;
export type NewWorkoutExercise = typeof workoutExercises.$inferInsert;
export type WorkoutSet = typeof workoutSets.$inferSelect;
export type NewWorkoutSet = typeof workoutSets.$inferInsert;
