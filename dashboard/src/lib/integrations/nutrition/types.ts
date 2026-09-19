/**
 * Provider-agnostic food database types.
 *
 * Every provider normalizes to macros per 100 g plus an optional list of
 * household serving sizes, which is the shape `food_entries` needs: the user
 * picks a serving, we multiply, we store grams and the four macros.
 */

/** Macros for a fixed quantity of food. */
export interface Macros {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number;
  sugarG?: number;
  sodiumMg?: number;
}

/** A selectable portion, e.g. "1 slice (28 g)". */
export interface ServingOption {
  label: string;
  /** Mass of one unit of this serving in grams. */
  grams: number;
}

/** A food as returned by search or lookup. */
export interface NormalizedFood {
  /** `"<provider>:<providerId>"`, stable enough to cache and to store on a food entry. */
  id: string;
  provider: FoodProvider;
  providerId: string;
  name: string;
  brand?: string;
  /** UPC/EAN when the provider has one. */
  barcode?: string;
  /**
   * Macros per 100 g. Null when the provider has no macro data for this item,
   * which happens often enough in USDA Foundation Foods to be worth checking.
   */
  per100g: Macros | null;
  servings: ServingOption[];
  /** Provider-specific category/data-type label, useful for ranking in the UI. */
  category?: string;
}

export type FoodProvider = "usda-fdc" | "open-food-facts";

export interface SearchFoodsOptions {
  /** Max results. Providers cap this; USDA allows up to 200. */
  limit?: number;
  /** 1-based page number. */
  page?: number;
  signal?: AbortSignal;
}

export interface GetFoodOptions {
  signal?: AbortSignal;
}

/** The interface every provider implements. */
export interface FoodDatabaseClient {
  readonly provider: FoodProvider;
  searchFoods(query: string, options?: SearchFoodsOptions): Promise<NormalizedFood[]>;
  /** Look up by the provider's own id (not the prefixed `NormalizedFood.id`). */
  getFood(providerId: string, options?: GetFoodOptions): Promise<NormalizedFood | null>;
}

export class FoodDatabaseError extends Error {
  constructor(
    message: string,
    readonly provider: FoodProvider,
    readonly status?: number,
  ) {
    super(message);
    this.name = "FoodDatabaseError";
  }
}

/** Scale per-100 g macros to an arbitrary gram amount. */
export function macrosForGrams(per100g: Macros, grams: number): Macros {
  const factor = grams / 100;
  const scale = (value: number | undefined) =>
    value === undefined ? undefined : round(value * factor);
  return {
    calories: round(per100g.calories * factor),
    proteinG: round(per100g.proteinG * factor),
    carbsG: round(per100g.carbsG * factor),
    fatG: round(per100g.fatG * factor),
    fiberG: scale(per100g.fiberG),
    sugarG: scale(per100g.sugarG),
    sodiumMg: scale(per100g.sodiumMg),
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
