/**
 * Open Food Facts client, used as the barcode/secondary provider.
 *
 * Why secondary rather than primary:
 * - No key and no signup, but the data is crowdsourced, so macro completeness
 *   and naming quality vary a lot by region.
 * - The licence is ODbL (attribution + share-alike on the database), whereas
 *   USDA FoodData Central is CC0. For a private dashboard neither matters, but
 *   CC0 is the cleaner default.
 * - Free-text search on `world.openfoodfacts.org/api/v2/search` is aggressively
 *   throttled and frequently answers with an HTML "Page temporarily
 *   unavailable" holding page. The dedicated `search.openfoodfacts.org`
 *   service is what actually works, and that is what `searchFoods` calls.
 *
 * Barcode lookup, by contrast, is fast and reliable, and it is the one thing
 * USDA cannot do well for non-US packaged food. That is the reason this client
 * exists: scan a barcode on the iPhone, resolve it here.
 *
 * The project asks for an identifying `User-Agent`; set
 * `OPEN_FOOD_FACTS_USER_AGENT` in `.env.local`, e.g.
 * `KrishDashboard/1.0 (krish@example.com)`.
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

const PRODUCT_BASE_URL = "https://world.openfoodfacts.org/api/v2";
const SEARCH_BASE_URL = "https://search.openfoodfacts.org";

const PRODUCT_FIELDS = [
  "code",
  "product_name",
  "generic_name",
  "brands",
  "categories",
  "serving_size",
  "serving_quantity",
  "nutriments",
].join(",");

interface OffNutriments {
  "energy-kcal_100g"?: number;
  energy_100g?: number;
  proteins_100g?: number;
  carbohydrates_100g?: number;
  fat_100g?: number;
  fiber_100g?: number;
  sugars_100g?: number;
  /** Grams per 100 g, not milligrams. */
  sodium_100g?: number;
}

interface OffProduct {
  code?: string;
  product_name?: string;
  generic_name?: string;
  brands?: string;
  categories?: string;
  serving_size?: string;
  serving_quantity?: number | string;
  nutriments?: OffNutriments;
}

export interface OpenFoodFactsClientOptions {
  /** Defaults to `process.env.OPEN_FOOD_FACTS_USER_AGENT`. */
  userAgent?: string;
  /** Request timeout in milliseconds. Defaults to 8000. */
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildMacros(nutriments: OffNutriments | undefined): Macros | null {
  if (!nutriments) return null;

  const calories =
    nutriments["energy-kcal_100g"] ??
    // `energy_100g` is kJ on most products.
    (typeof nutriments.energy_100g === "number" ? nutriments.energy_100g * 0.239005736 : undefined);

  const proteinG = nutriments.proteins_100g;
  const carbsG = nutriments.carbohydrates_100g;
  const fatG = nutriments.fat_100g;

  if (calories === undefined && proteinG === undefined && carbsG === undefined && fatG === undefined) {
    return null;
  }

  return {
    calories: round(calories ?? 0),
    proteinG: round(proteinG ?? 0),
    carbsG: round(carbsG ?? 0),
    fatG: round(fatG ?? 0),
    fiberG: nutriments.fiber_100g === undefined ? undefined : round(nutriments.fiber_100g),
    sugarG: nutriments.sugars_100g === undefined ? undefined : round(nutriments.sugars_100g),
    sodiumMg: nutriments.sodium_100g === undefined ? undefined : round(nutriments.sodium_100g * 1000),
  };
}

function buildServings(product: OffProduct): ServingOption[] {
  const servings: ServingOption[] = [{ label: "100 g", grams: 100 }];
  const quantity =
    typeof product.serving_quantity === "string"
      ? Number.parseFloat(product.serving_quantity)
      : product.serving_quantity;
  if (typeof quantity === "number" && Number.isFinite(quantity) && quantity > 0) {
    servings.unshift({ label: product.serving_size?.trim() || `${quantity} g`, grams: quantity });
  }
  return servings;
}

function normalize(product: OffProduct): NormalizedFood | null {
  const code = product.code;
  if (!code) return null;
  const brand = product.brands?.split(",")[0]?.trim();
  return {
    id: `open-food-facts:${code}`,
    provider: "open-food-facts",
    providerId: code,
    name: product.product_name?.trim() || product.generic_name?.trim() || `Barcode ${code}`,
    brand: brand || undefined,
    barcode: code,
    per100g: buildMacros(product.nutriments),
    servings: buildServings(product),
    category: product.categories?.split(",")[0]?.trim() || undefined,
  };
}

export class OpenFoodFactsClient implements FoodDatabaseClient {
  readonly provider = "open-food-facts" as const;

  private readonly userAgent: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: OpenFoodFactsClientOptions = {}) {
    this.userAgent =
      options.userAgent ?? process.env.OPEN_FOOD_FACTS_USER_AGENT ?? "KrishDashboard/1.0";
    this.timeoutMs = options.timeoutMs ?? 8_000;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private async request<T>(url: string, signal?: AbortSignal): Promise<T> {
    const timeout = AbortSignal.timeout(this.timeoutMs);
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        signal: combined,
        headers: { Accept: "application/json", "User-Agent": this.userAgent },
      });
    } catch (error) {
      throw new FoodDatabaseError(
        `Open Food Facts request failed: ${error instanceof Error ? error.message : String(error)}`,
        "open-food-facts",
      );
    }

    if (!response.ok) {
      throw new FoodDatabaseError(
        `Open Food Facts returned ${response.status} ${response.statusText}`,
        "open-food-facts",
        response.status,
      );
    }

    // Throttled responses come back as an HTML holding page with a 200 status,
    // so the content type has to be checked rather than trusted.
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("json")) {
      throw new FoodDatabaseError(
        "Open Food Facts returned a non-JSON response (usually its rate-limit holding page).",
        "open-food-facts",
        response.status,
      );
    }
    return (await response.json()) as T;
  }

  async searchFoods(query: string, options: SearchFoodsOptions = {}): Promise<NormalizedFood[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const params = new URLSearchParams({
      q: trimmed,
      page_size: String(Math.min(Math.max(options.limit ?? 25, 1), 50)),
      page: String(Math.max(options.page ?? 1, 1)),
      fields: PRODUCT_FIELDS,
    });

    const body = await this.request<{ hits?: OffProduct[] }>(
      `${SEARCH_BASE_URL}/search?${params.toString()}`,
      options.signal,
    );

    return (body.hits ?? [])
      .map(normalize)
      .filter((food): food is NormalizedFood => food !== null)
      .sort((a, b) => Number(b.per100g !== null) - Number(a.per100g !== null));
  }

  /** `providerId` is the barcode (EAN-13 / UPC-A). */
  async getFood(providerId: string, options: GetFoodOptions = {}): Promise<NormalizedFood | null> {
    const barcode = providerId.replace(/\D/g, "");
    if (!barcode) return null;

    const body = await this.request<{ status?: number; product?: OffProduct }>(
      `${PRODUCT_BASE_URL}/product/${barcode}.json?fields=${encodeURIComponent(PRODUCT_FIELDS)}`,
      options.signal,
    );

    if (body.status !== 1 || !body.product) return null;
    return normalize({ ...body.product, code: body.product.code ?? barcode });
  }

  /** Alias that reads better at call sites in the food logger. */
  lookupBarcode(barcode: string, options: GetFoodOptions = {}): Promise<NormalizedFood | null> {
    return this.getFood(barcode, options);
  }
}
