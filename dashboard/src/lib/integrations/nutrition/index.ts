/**
 * Food database entry point.
 *
 * `getFoodDatabase()` returns a client that searches USDA FoodData Central and
 * falls back to Open Food Facts for anything that looks like a barcode. That
 * combination covers US generics and restaurant-adjacent items (USDA) plus
 * scanned international packaged goods (Open Food Facts) with one free key and
 * no subscription.
 *
 * Environment variables:
 *   USDA_FDC_API_KEY            required. https://fdc.nal.usda.gov/api-key-signup
 *   OPEN_FOOD_FACTS_USER_AGENT  optional but requested by the project, e.g.
 *                               "KrishDashboard/1.0 (krish@example.com)"
 */

import { OpenFoodFactsClient } from "./open-food-facts";
import { UsdaFdcClient } from "./usda-fdc";
import type {
  FoodDatabaseClient,
  GetFoodOptions,
  NormalizedFood,
  SearchFoodsOptions,
} from "./types";

export * from "./types";
export { UsdaFdcClient, DEFAULT_DATA_TYPES } from "./usda-fdc";
export { OpenFoodFactsClient } from "./open-food-facts";

const BARCODE = /^\d{8,14}$/;

/**
 * Routes queries to the right provider and resolves `"<provider>:<id>"` ids.
 *
 * Search order is USDA first; Open Food Facts is queried only when the query is
 * a barcode or when USDA returns nothing, which keeps us inside USDA's
 * 1,000 requests/hour budget during normal use.
 */
export class CompositeFoodDatabase implements FoodDatabaseClient {
  readonly provider = "usda-fdc" as const;

  constructor(
    private readonly usda: FoodDatabaseClient,
    private readonly openFoodFacts: FoodDatabaseClient,
  ) {}

  async searchFoods(query: string, options: SearchFoodsOptions = {}): Promise<NormalizedFood[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    if (BARCODE.test(trimmed)) {
      const scanned = await this.openFoodFacts.getFood(trimmed, { signal: options.signal });
      if (scanned) return [scanned];
    }

    const primary = await this.usda.searchFoods(trimmed, options);
    if (primary.length > 0) return primary;

    try {
      return await this.openFoodFacts.searchFoods(trimmed, options);
    } catch {
      // Open Food Facts free-text search is best-effort; an empty result is a
      // better outcome than failing a search the user is typing into.
      return [];
    }
  }

  /** Accepts either a prefixed `NormalizedFood.id` or a bare USDA FDC id. */
  async getFood(id: string, options: GetFoodOptions = {}): Promise<NormalizedFood | null> {
    const separator = id.indexOf(":");
    if (separator === -1) return this.usda.getFood(id, options);

    const provider = id.slice(0, separator);
    const providerId = id.slice(separator + 1);
    if (provider === "open-food-facts") return this.openFoodFacts.getFood(providerId, options);
    return this.usda.getFood(providerId, options);
  }
}

let cached: CompositeFoodDatabase | null = null;

/** Lazily constructed singleton. Throws if `USDA_FDC_API_KEY` is missing. */
export function getFoodDatabase(): CompositeFoodDatabase {
  if (!cached) {
    cached = new CompositeFoodDatabase(new UsdaFdcClient(), new OpenFoodFactsClient());
  }
  return cached;
}
