import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ForkKnifeIcon } from "@phosphor-icons/react/dist/ssr";

import { FoodPhotoLogger } from "@/components/nutrition/food-photo-logger";
import { ManualMealLogger } from "@/components/nutrition/manual-meal-logger";
import { NutritionRings } from "@/components/nutrition/nutrition-rings";
import { RecentMealList } from "@/components/nutrition/recent-meal-list";
import { SampleMealButton } from "@/components/nutrition/sample-meal-button";
import {
  EmptyState,
  MetricCard,
  PageHeader,
  Panel,
  PanelBody,
  PanelDescription,
  PanelHeader,
  PanelTitle,
} from "@/components/kit";
import { getDashboardUserId } from "@/lib/auth-user";
import { NUTRITION_GOALS, loadNutritionSummary } from "@/lib/nutrition";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Nutrition" };

export default async function NutritionPage() {
  const userId = await getDashboardUserId();
  if (!userId) redirect("/sign-in");

  const nutrition = await loadNutritionSummary(userId, { recentLimit: 24 });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Fuel"
        title="Nutrition"
        description="Snap a plate or log macros by hand — same meals table either way."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-stretch">
        <Panel className="lg:col-span-4">
          <PanelHeader>
            <div className="min-w-0">
              <PanelTitle>Today</PanelTitle>
              <PanelDescription>
                Soft targets {NUTRITION_GOALS.calories} kcal ·{" "}
                {NUTRITION_GOALS.proteinG}g protein
              </PanelDescription>
            </div>
          </PanelHeader>
          <PanelBody>
            <div className="flex items-center gap-5">
              <div className="ring-glow">
                <NutritionRings
                  calories={nutrition.rings.calories}
                  protein={nutrition.rings.protein}
                  size={112}
                />
              </div>
              <ul className="min-w-0 space-y-2 text-sm">
                <li className="flex justify-between gap-3">
                  <span className="text-lime">Calories</span>
                  <span className="num text-text">
                    {nutrition.caloriesToday
                      ? Math.round(nutrition.caloriesToday)
                      : "—"}
                    <span className="ml-1 text-xs text-text-faint">kcal</span>
                  </span>
                </li>
                <li className="flex justify-between gap-3">
                  <span className="text-[#8fd14f]">Protein</span>
                  <span className="num text-text">
                    {nutrition.proteinToday
                      ? Math.round(nutrition.proteinToday)
                      : "—"}
                    <span className="ml-1 text-xs text-text-faint">g</span>
                  </span>
                </li>
              </ul>
            </div>
          </PanelBody>
        </Panel>

        <div className="grid grid-cols-2 gap-3 lg:col-span-8 sm:grid-cols-4">
          <MetricCard
            label="Calories today"
            value={nutrition.caloriesToday || null}
            unit="kcal"
          />
          <MetricCard
            label="Protein today"
            value={
              nutrition.proteinToday
                ? Math.round(nutrition.proteinToday)
                : null
            }
            unit="g"
          />
          <MetricCard
            label="Meals today"
            value={nutrition.mealsToday || null}
          />
          <MetricCard
            label="Meals logged"
            value={nutrition.mealsLogged || null}
            icon={ForkKnifeIcon}
          />
        </div>
      </div>

      <FoodPhotoLogger />

      <Panel>
        <PanelHeader>
          <div className="min-w-0">
            <PanelTitle>Manual entry</PanelTitle>
            <PanelDescription>
              Writes to hub.meals + food_entries with source=manual
            </PanelDescription>
          </div>
        </PanelHeader>
        <PanelBody>
          <ManualMealLogger />
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader>
          <PanelTitle>Recent meals</PanelTitle>
        </PanelHeader>
        <PanelBody flush>
          {nutrition.recent.length === 0 ? (
            <EmptyState
              icon={ForkKnifeIcon}
              title="No meals yet"
              description="Take a photo, log macros, or drop in a sample lunch to see rings fill."
              action={
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <SampleMealButton />
                </div>
              }
            />
          ) : (
            <RecentMealList
              meals={nutrition.recent.map((meal) => ({
                id: meal.id,
                date: meal.date,
                name: meal.name,
                mealType: meal.mealType,
                calories: meal.calories,
                protein: meal.protein,
              }))}
            />
          )}
        </PanelBody>
      </Panel>
    </div>
  );
}
