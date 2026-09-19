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

import { users } from "./auth";
import { hub, mealTypeEnum, sourceEnum } from "./_shared";

export const meals = hub.table(
  "meals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
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
  (t) => [index("meals_user_date_idx").on(t.userId, t.date)],
);

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

export const mealsRelations = relations(meals, ({ many, one }) => ({
  foodEntries: many(foodEntries),
  user: one(users, { fields: [meals.userId], references: [users.id] }),
}));

export const foodEntriesRelations = relations(foodEntries, ({ one }) => ({
  meal: one(meals, { fields: [foodEntries.mealId], references: [meals.id] }),
}));

export type Meal = typeof meals.$inferSelect;
export type NewMeal = typeof meals.$inferInsert;
export type FoodEntry = typeof foodEntries.$inferSelect;
export type NewFoodEntry = typeof foodEntries.$inferInsert;
