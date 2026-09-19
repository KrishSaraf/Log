/**
 * USDA FoodData Central client.
 *
 * Chosen as the primary food database because it is the only option that is
 * simultaneously free, key-gated (so it is rate-limit stable rather than
 * best-effort), public domain (CC0, no attribution or share-alike obligation),
 * and complete on the four macros for the data types we query.
 *
 * Get a key at https://fdc.nal.usda.gov/api-key-signup — free, instant, no card.
 * Put it in `.env.local` as `USDA_FDC_API_KEY`. Rate limit is 1,000 requests
 * per hour per key; `DEMO_KEY` works for smoke tests at 30/hour and 50/day.
 *
 * Two response-shape quirks, both confirmed against the live API in 2026:
 *
 * - `/foods/search` returns nutrients as
 *   `{ nutrientId, nutrientNumber, nutrientName, unitName, value }`, while
 *   `/food/{id}?format=abridged` returns `{ number, name, unitName, amount }`.
 *   `readNutrient` handles both.
 * - `/food/{id}` without `format=abridged` can return nutrients as bare
 *   `{ type, id, amount }` with no nutrient metadata, which is unusable. Always
 *   request the abridged format.
 */

import {
  FoodDatabaseError,
  type FoodDatabaseClient,
  type GetFoodOptions,
  type Macros,
  type NormalizedFood,
  type SearchFoodsOptions,
  type ServingOption,
} from "./types";

const BASE_URL = "https://api.nal.usda.gov/fdc/v1";

/**
 * Data types to search, in preference order.
 *
 * `Foundation` is deliberately excluded by default: many Foundation entries
 * carry only a fatty-acid or mineral panel with no energy, protein, carb or fat
 * value at all, so they surface in search as macro-less results.
 */
export const DEFAULT_DATA_TYPES = ["SR Legacy", "Survey (FNDDS)", "Branded"] as const;

/**
 * USDA nutrient numbers for the fields we care about.
 *
 * The API also supports a `nutrients=` filter to trim the response, but it is
 * deliberately not used: several data types answer it with an empty
 * `foodNutrients` array, and the untrimmed payload is small enough for a
 * single-user app.
 */
const NUTRIENT_NUMBERS = {
  energyKcal: "208",
  energyKj: "268",
  protein: "203",
  fat: "204",
  carbs: "205",
  fiber: "291",
  sugars: "269",
  sodium: "307",
} as const;

interface FdcNutrient {
  // search shape
  nutrientId?: number;
  nutrientNumber?: string;
  nutrientName?: string;
  value?: number;
  // abridged detail shape
  number?: string;
  name?: string;
  amount?: number;
  unitName?: string;
}

interface FdcFood {
  fdcId: number;
  description?: string;
  dataType?: string;
  brandOwner?: string;
  brandName?: string;
  gtinUpc?: string;
  foodCategory?: string | { description?: string };
  brandedFoodCategory?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
  foodNutrients?: FdcNutrient[];
}

interface FdcSearchResponse {
  totalHits?: number;
  foods?: FdcFood[];
}

export interface UsdaFdcClientOptions {
  /** Defaults to `process.env.USDA_FDC_API_KEY`. */
  apiKey?: string;
  /** Defaults to `DEFAULT_DATA_TYPES`. */
  dataTypes?: readonly string[];
  /** Request timeout in milliseconds. Defaults to 8000. */
  timeoutMs?: number;
  /** Injection point for tests. Defaults to global `fetch`. */
  fetchImpl?: typeof fetch;
  /** In-memory `getFood` cache size. Set to 0 to disable. Defaults to 500. */
  cacheSize?: number;
}

/** Read one nutrient value, tolerating both response shapes. */
function readNutrient(nutrients: FdcNutrient[], nutrientNumber: string): number | undefined {
  for (const nutrient of nutrients) {
    const number = nutrient.nutrientNumber ?? nutrient.number;
    if (number !== nutrientNumber) continue;
    const value = nutrient.value ?? nutrient.amount;
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return undefined;
}

function buildMacros(nutrients: FdcNutrient[] | undefined): Macros | null {
  if (!nutrients || nutrients.length === 0) return null;

  let calories = readNutrient(nutrients, NUTRIENT_NUMBERS.energyKcal);
  if (calories === undefined) {
    // Foundation and newer FNDDS entries sometimes only carry the Atwater
    // variants ("Energy (Atwater General Factors)"), which have their own
    // nutrient numbers. Match on unit instead of hardcoding those numbers.
    calories = findByNameAndUnit(nutrients, "energy", "kcal");
  }
  if (calories === undefined) {
    const kj =
      readNutrient(nutrients, NUTRIENT_NUMBERS.energyKj) ??
      findByNameAndUnit(nutrients, "energy", "kj");
    if (kj !== undefined) calories = kj * 0.239005736;
  }

  const proteinG = readNutrient(nutrients, NUTRIENT_NUMBERS.protein);
  const carbsG = readNutrient(nutrients, NUTRIENT_NUMBERS.carbs);
  const fatG = readNutrient(nutrients, NUTRIENT_NUMBERS.fat);

  // An entry with no energy and no macros is a specialist panel, not a food we
  // can log. Surfacing it as `null` lets the UI hide or flag it.
  if (calories === undefined && proteinG === undefined && carbsG === undefined && fatG === undefined) {
    return null;
  }

  return {
    calories: round(calories ?? 0),
    proteinG: round(proteinG ?? 0),
    carbsG: round(carbsG ?? 0),
    fatG: round(fatG ?? 0),
    fiberG: optional(readNutrient(nutrients, NUTRIENT_NUMBERS.fiber)),
    sugarG: optional(readNutrient(nutrients, NUTRIENT_NUMBERS.sugars)),
    sodiumMg: optional(readNutrient(nutrients, NUTRIENT_NUMBERS.sodium)),
  };
}

function findByNameAndUnit(
  nutrients: FdcNutrient[],
  namePrefix: string,
  unit: string,
): number | undefined {
  for (const nutrient of nutrients) {
    const name = (nutrient.nutrientName ?? nutrient.name ?? "").toLowerCase();
    if (!name.startsWith(namePrefix)) continue;
    if ((nutrient.unitName ?? "").toLowerCase() !== unit) continue;
    const value = nutrient.value ?? nutrient.amount;
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return undefined;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function optional(value: number | undefined): number | undefined {
  return value === undefined ? undefined : round(value);
}

function buildServings(food: FdcFood): ServingOption[] {
  const servings: ServingOption[] = [{ label: "100 g", grams: 100 }];
  const size = food.servingSize;
  const unit = (food.servingSizeUnit ?? "").toLowerCase();

  // `ml` servings are treated as 1 g/ml. That is exact for water, close enough
  // for most drinks, and wrong for oils; the UI lets the user override grams.
  if (typeof size === "number" && size > 0 && (unit === "g" || unit === "ml" || unit === "grm")) {
    const label = food.householdServingFullText?.trim()
      ? `${food.householdServingFullText.trim()} (${size} ${food.servingSizeUnit})`
      : `${size} ${food.servingSizeUnit}`;
    servings.unshift({ label, grams: size });
  }
  return servings;
}

function categoryOf(food: FdcFood): string | undefined {
  if (typeof food.foodCategory === "string") return food.foodCategory;
  if (food.foodCategory?.description) return food.foodCategory.description;
  return food.brandedFoodCategory ?? food.dataType;
}

function normalize(food: FdcFood): NormalizedFood {
  return {
    id: `usda-fdc:${food.fdcId}`,
    provider: "usda-fdc",
    providerId: String(food.fdcId),
    name: titleCaseIfShouty(food.description ?? `FDC ${food.fdcId}`),
    brand: food.brandName || food.brandOwner || undefined,
    barcode: food.gtinUpc || undefined,
    per100g: buildMacros(food.foodNutrients),
    servings: buildServings(food),
    category: categoryOf(food),
  };
}

/** Branded USDA descriptions are all-caps; make them readable in the picker. */
function titleCaseIfShouty(value: string): string {
  if (value !== value.toUpperCase()) return value;
  return value
    .toLowerCase()
    .replace(/(^|[\s(/-])([a-z])/g, (_, prefix: string, letter: string) => prefix + letter.toUpperCase());
}

export class UsdaFdcClient implements FoodDatabaseClient {
  readonly provider = "usda-fdc" as const;

  private readonly apiKey: string;
  private readonly dataTypes: readonly string[];
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly cacheSize: number;
  private readonly cache = new Map<string, NormalizedFood | null>();

  constructor(options: UsdaFdcClientOptions = {}) {
    const apiKey = options.apiKey ?? process.env.USDA_FDC_API_KEY;
    if (!apiKey) {
      throw new FoodDatabaseError(
        "USDA_FDC_API_KEY is not set. Get a free key at https://fdc.nal.usda.gov/api-key-signup and add it to .env.local.",
        "usda-fdc",
      );
    }
    this.apiKey = apiKey;
    this.dataTypes = options.dataTypes ?? DEFAULT_DATA_TYPES;
    this.timeoutMs = options.timeoutMs ?? 8_000;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.cacheSize = options.cacheSize ?? 500;
  }

  private async request<T>(path: string, params: URLSearchParams, signal?: AbortSignal): Promise<T> {
    params.set("api_key", this.apiKey);
    const url = `${BASE_URL}${path}?${params.toString()}`;

    const timeout = AbortSignal.timeout(this.timeoutMs);
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;

    let response: Response;
    try {
      response = await this.fetchImpl(url, { signal: combined, headers: { Accept: "application/json" } });
    } catch (error) {
      throw new FoodDatabaseError(
        `FoodData Central request failed: ${error instanceof Error ? error.message : String(error)}`,
        "usda-fdc",
      );
    }

    if (response.status === 429) {
      throw new FoodDatabaseError(
        "FoodData Central rate limit reached (1,000 requests/hour). The key is blocked for up to an hour.",
        "usda-fdc",
        429,
      );
    }
    if (!response.ok) {
      throw new FoodDatabaseError(
        `FoodData Central returned ${response.status} ${response.statusText}`,
        "usda-fdc",
        response.status,
      );
    }
    return (await response.json()) as T;
  }

  async searchFoods(query: string, options: SearchFoodsOptions = {}): Promise<NormalizedFood[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const params = new URLSearchParams({
      query: trimmed,
      pageSize: String(Math.min(Math.max(options.limit ?? 25, 1), 200)),
      pageNumber: String(Math.max(options.page ?? 1, 1)),
    });
    for (const dataType of this.dataTypes) params.append("dataType", dataType);

    const body = await this.request<FdcSearchResponse>("/foods/search", params, options.signal);
    const foods = (body.foods ?? []).map(normalize);

    // Push macro-less entries to the bottom instead of dropping them; some are
    // legitimately useful (spices, water) and the user may still want them.
    return foods.sort((a, b) => Number(b.per100g !== null) - Number(a.per100g !== null));
  }

  async getFood(providerId: string, options: GetFoodOptions = {}): Promise<NormalizedFood | null> {
    const cached = this.cache.get(providerId);
    if (cached !== undefined) return cached;

    // `format=abridged` is required: the full format can return nutrients as
    // bare `{ type, id, amount }` objects with no name, number or unit.
    const params = new URLSearchParams({ format: "abridged" });

    let food: NormalizedFood | null;
    try {
      const body = await this.request<FdcFood>(
        `/food/${encodeURIComponent(providerId)}`,
        params,
        options.signal,
      );
      food = body?.fdcId ? normalize(body) : null;
    } catch (error) {
      if (error instanceof FoodDatabaseError && error.status === 404) food = null;
      else throw error;
    }

    if (this.cacheSize > 0) {
      if (this.cache.size >= this.cacheSize) {
        const oldest = this.cache.keys().next();
        if (!oldest.done) this.cache.delete(oldest.value);
      }
      this.cache.set(providerId, food);
    }
    return food;
  }
}
