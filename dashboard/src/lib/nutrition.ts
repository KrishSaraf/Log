import { desc, eq, sql } from "drizzle-orm";

import { db, foodEntries, meals } from "@/db";
import { todayIso, toNumber } from "@/lib/format";
import { safely } from "@/lib/safe-query";

/** Soft daily targets for Today nutrition rings — not user goals yet. */
export const NUTRITION_GOALS = {
  calories: 2200,
  proteinG: 140,
} as const;

export type NutritionMealRow = {
  id: string;
  date: string;
  name: string | null;
  mealType: string;
  calories: number;
  protein: number;
};

export type NutritionSummary = {
  date: string;
  caloriesToday: number;
  proteinToday: number;
  mealsToday: number;
  mealsLogged: number;
  recent: NutritionMealRow[];
  /** 0..1 against soft daily goals. */
  rings: {
    calories: number;
    protein: number;
  };
};

function ringProgress(value: number, goal: number) {
  if (goal <= 0 || value <= 0) return 0;
  return Math.min(1, value / goal);
}

/**
 * Same meal + food_entries aggregate the Nutrition page already uses.
 * Do not invent a parallel nutrition schema — this is the hub source of truth.
 */
export async function loadNutritionSummary(
  userId: string,
  options?: { recentLimit?: number },
): Promise<NutritionSummary> {
  const date = todayIso();
  const limit = options?.recentLimit ?? 12;

  const recentRaw = await safely(
    () =>
      db
        .select({
          id: meals.id,
          date: meals.date,
          name: meals.name,
          mealType: meals.mealType,
          calories: sql<string>`coalesce(sum(${foodEntries.calories}), 0)`,
          protein: sql<string>`coalesce(sum(${foodEntries.proteinG}), 0)`,
        })
        .from(meals)
        .leftJoin(foodEntries, eq(foodEntries.mealId, meals.id))
        .where(eq(meals.userId, userId))
        .groupBy(meals.id)
        .orderBy(desc(meals.date), desc(meals.createdAt))
        .limit(limit),
    [] as {
      id: string;
      date: string;
      name: string | null;
      mealType: string;
      calories: string;
      protein: string;
    }[],
    "nutrition meals",
  );

  const recent: NutritionMealRow[] = recentRaw.map((row) => ({
    id: row.id,
    date: row.date,
    name: row.name,
    mealType: row.mealType,
    calories: toNumber(row.calories) ?? 0,
    protein: toNumber(row.protein) ?? 0,
  }));

  const todayMeals = recent.filter((m) => m.date === date);
  const caloriesToday = todayMeals.reduce((acc, m) => acc + m.calories, 0);
  const proteinToday = todayMeals.reduce((acc, m) => acc + m.protein, 0);

  return {
    date,
    caloriesToday,
    proteinToday,
    mealsToday: todayMeals.length,
    mealsLogged: recent.length,
    recent,
    rings: {
      calories: ringProgress(caloriesToday, NUTRITION_GOALS.calories),
      protein: ringProgress(proteinToday, NUTRITION_GOALS.proteinG),
    },
  };
}
