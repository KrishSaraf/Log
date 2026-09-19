import { relations } from "drizzle-orm";
import {
  date,
  index,
  numeric,
  text,
  time,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { hub, mealTypeEnum, sourceEnum } from "./_shared";

/** One eating occasion. Macros are not stored here, they roll up from food entries. */
export const meals = hub.table(
  "meals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    date: date("date").notNull(),
    name: text("name"),
    mealType: mealTypeEnum("meal_type").notNull().default("snack"),
    time: time("time"),
    notes: text("notes"),
    source: sourceEnum("source").notNull().default("manual"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("meals_date_idx").on(t.date)],
);

/**
 * A single food within a meal. Calories and macros are per entry, already
 * scaled to `quantity`, so a day total is a plain SUM with no unit maths.
 */
export const foodEntries = hub.table(
  "food_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mealId: uuid("meal_id")
      .notNull()
      .references(() => meals.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    quantity: numeric("quantity", { precision: 10, scale: 2 }),
    unit: text("unit"),
    calories: numeric("calories", { precision: 10, scale: 2 }),
    proteinG: numeric("protein_g", { precision: 8, scale: 2 }),
    carbsG: numeric("carbs_g", { precision: 8, scale: 2 }),
    fatG: numeric("fat_g", { precision: 8, scale: 2 }),
  },
  (t) => [index("food_entries_meal_idx").on(t.mealId)],
);

export const mealsRelations = relations(meals, ({ many }) => ({
  foodEntries: many(foodEntries),
}));

export const foodEntriesRelations = relations(foodEntries, ({ one }) => ({
  meal: one(meals, { fields: [foodEntries.mealId], references: [meals.id] }),
}));

export type Meal = typeof meals.$inferSelect;
export type NewMeal = typeof meals.$inferInsert;
export type FoodEntry = typeof foodEntries.$inferSelect;
export type NewFoodEntry = typeof foodEntries.$inferInsert;
