import { OpenFoodFactsClient } from "@/lib/integrations/nutrition/open-food-facts";
import { UsdaFdcClient } from "@/lib/integrations/nutrition/usda-fdc";
import {
  macrosForGrams,
  type Macros,
  type NormalizedFood,
} from "@/lib/integrations/nutrition/types";

import type { FoodItemDraft, MealDraft } from "./food-vision";

const BARCODE = /^\d{8,14}$/;

function gramsFor(food: FoodItemDraft, hit: NormalizedFood): number {
  const unit = (food.unit ?? "").toLowerCase();
  const qty = food.quantity;
  if (typeof qty === "number" && qty > 0) {
    if (unit === "g" || unit === "gram" || unit === "grams") return qty;
    if (unit === "kg") return qty * 1000;
    if (unit === "ml" || unit === "milliliter" || unit === "millilitre") return qty;
    if (unit === "serving" || unit === "servings" || unit === "pack" || unit === "packet") {
      const serving = hit.servings.find((s) => s.grams !== 100) ?? hit.servings[0];
      return (serving?.grams ?? 100) * qty;
    }
  }
  const serving = hit.servings.find((s) => s.grams !== 100);
  return serving?.grams ?? 100;
}

function applyMacros(food: FoodItemDraft, macros: Macros): FoodItemDraft {
  return {
    ...food,
    calories: Math.round(macros.calories),
    proteinG: Math.round(macros.proteinG),
    carbsG: Math.round(macros.carbsG),
    fatG: Math.round(macros.fatG),
  };
}

async function lookup(query: string): Promise<NormalizedFood | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const off = new OpenFoodFactsClient();
  if (BARCODE.test(trimmed.replace(/\s/g, ""))) {
    try {
      const hit = await off.lookupBarcode(trimmed.replace(/\s/g, ""));
      if (hit?.per100g) return hit;
    } catch {
      /* continue */
    }
  }

  try {
    const hits = await off.searchFoods(trimmed, { limit: 5 });
    const match = hits.find((food) => food.per100g);
    if (match) return match;
  } catch {
    /* USDA next */
  }

  try {
    const usda = new UsdaFdcClient();
    const hits = await usda.searchFoods(trimmed, { limit: 5 });
    return hits.find((food) => food.per100g) ?? null;
  } catch {
    return null;
  }
}

function queryFor(food: FoodItemDraft): string {
  const barcode = food.barcode?.replace(/\D/g, "") ?? "";
  if (BARCODE.test(barcode)) return barcode;
  const search = food.searchQuery?.trim();
  if (search) return search;
  const brand = food.brand?.trim();
  if (brand) return `${brand} ${food.name}`.trim();
  return food.name;
}

/** Fill packaged / branded items from product labels when a match exists. */
export async function enrichMealDraft(draft: MealDraft): Promise<MealDraft> {
  const foods = await Promise.all(
    draft.foods.map(async (food) => {
      const shouldLookup = food.packaged || Boolean(food.brand) || Boolean(food.barcode);
      if (!shouldLookup && food.calories != null && food.proteinG != null) {
        return food;
      }
      const hit = await lookup(queryFor(food));
      if (!hit?.per100g) return food;
      const macros = macrosForGrams(hit.per100g, gramsFor(food, hit));
      return applyMacros(
        {
          ...food,
          name: [hit.brand, hit.name].filter(Boolean).join(" ") || food.name,
        },
        macros,
      );
    }),
  );

  return { ...draft, foods };
}
