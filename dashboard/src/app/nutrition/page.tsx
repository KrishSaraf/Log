import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ForkKnifeIcon } from "@phosphor-icons/react/dist/ssr";
import { desc, eq, sql } from "drizzle-orm";

import { auth } from "@/auth";
import { FoodPhotoLogger } from "@/components/nutrition/food-photo-logger";
import {
  EmptyState,
  MetricCard,
  PageHeader,
  Panel,
  PanelBody,
  PanelHeader,
  PanelTitle,
} from "@/components/kit";
import { db, foodEntries, meals } from "@/db";
import { formatShortDate, todayIso, toNumber } from "@/lib/format";
import { safely } from "@/lib/safe-query";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Nutrition" };

export default async function NutritionPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");
  const userId = session.user.id;
  const today = todayIso();

  const recent = await safely(
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
        .limit(12),
    [] as {
      id: string;
      date: string;
      name: string | null;
      mealType: string;
      calories: string;
      protein: string;
    }[],
    "recent meals",
  );

  const todayMeals = recent.filter((m) => m.date === today);
  const caloriesToday = todayMeals.reduce(
    (acc, m) => acc + (toNumber(m.calories) ?? 0),
    0,
  );
  const proteinToday = todayMeals.reduce(
    (acc, m) => acc + (toNumber(m.protein) ?? 0),
    0,
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Nutrition"
        description="Snap what you eat. Review the estimate, then save."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard
          label="Calories today"
          value={caloriesToday || null}
          unit="kcal"
        />
        <MetricCard
          label="Protein today"
          value={proteinToday ? Math.round(proteinToday) : null}
          unit="g"
        />
        <MetricCard label="Meals today" value={todayMeals.length || null} />
        <MetricCard
          label="Meals logged"
          value={recent.length || null}
          icon={ForkKnifeIcon}
        />
      </div>

      <FoodPhotoLogger />

      <Panel>
        <PanelHeader>
          <PanelTitle>Recent meals</PanelTitle>
        </PanelHeader>
        <PanelBody flush>
          {recent.length === 0 ? (
            <EmptyState
              icon={ForkKnifeIcon}
              title="No meals yet"
              description="Take a photo of your next plate and it will show up here."
            />
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((meal) => (
                <li
                  key={meal.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text">
                      {meal.name || "Meal"}
                    </p>
                    <p className="text-xs text-text-faint">
                      {formatShortDate(meal.date)} · {meal.mealType}
                    </p>
                  </div>
                  <p className="num shrink-0 text-sm text-text-muted">
                    {Math.round(toNumber(meal.calories) ?? 0)} kcal
                  </p>
                </li>
              ))}
            </ul>
          )}
        </PanelBody>
      </Panel>
    </div>
  );
}
