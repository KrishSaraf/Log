import assert from "node:assert/strict";
import test from "node:test";

import { OpenFoodFactsClient } from "../nutrition/open-food-facts";
import { CompositeFoodDatabase } from "../nutrition/index";
import { FoodDatabaseError, macrosForGrams } from "../nutrition/types";
import { UsdaFdcClient } from "../nutrition/usda-fdc";
import { FDC_ABRIDGED_FOOD, FDC_SEARCH_RESPONSE, OFF_PRODUCT_RESPONSE } from "./fixtures";

/** Records every URL requested and replies with a canned JSON body. */
function stubFetch(routes: Array<[RegExp, unknown]>) {
  const calls: string[] = [];
  const impl: typeof fetch = async (input) => {
    const url = typeof input === "string" ? input : input.toString();
    calls.push(url);
    for (const [pattern, body] of routes) {
      if (pattern.test(url)) {
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
    }
    return new Response("not found", { status: 404 });
  };
  return { impl, calls };
}

test("the USDA client normalizes search results to macros per 100 g", async () => {
  const { impl, calls } = stubFetch([[/foods\/search/, FDC_SEARCH_RESPONSE]]);
  const client = new UsdaFdcClient({ apiKey: "test-key", fetchImpl: impl });

  const results = await client.searchFoods("cheddar cheese", { limit: 10 });
  assert.equal(results.length, 2);

  const [cheese, lunchmeat] = results;
  assert.equal(cheese.id, "usda-fdc:2057648");
  assert.equal(cheese.provider, "usda-fdc");
  // All-caps USDA descriptions are made readable for the picker.
  assert.equal(cheese.name, "Cheddar Cheese");
  assert.equal(cheese.brand, "GRAFTON VILLAGE");
  assert.equal(cheese.barcode, "094395000172");
  assert.deepEqual(cheese.per100g, {
    calories: 357,
    proteinG: 21.4,
    carbsG: 3.57,
    fatG: 28.6,
    fiberG: undefined,
    sugarG: undefined,
    sodiumMg: 643,
  });
  assert.deepEqual(cheese.servings, [
    { label: "1 ONZ (28 g)", grams: 28 },
    { label: "100 g", grams: 100 },
  ]);

  // Entries with only a specialist nutrient panel report null macros and sort
  // to the bottom instead of pretending to be zero-calorie food.
  assert.equal(lunchmeat.per100g, null);

  assert.ok(calls[0].includes("api_key=test-key"));
  assert.ok(calls[0].includes("dataType=SR+Legacy"));
  assert.ok(!calls[0].includes("dataType=Foundation"));
});

test("the USDA client reads the abridged detail shape and caches it", async () => {
  const { impl, calls } = stubFetch([[/\/food\/2057648/, FDC_ABRIDGED_FOOD]]);
  const client = new UsdaFdcClient({ apiKey: "test-key", fetchImpl: impl });

  const food = await client.getFood("2057648");
  assert.ok(food);
  // The abridged shape uses { number, name, amount } instead of
  // { nutrientNumber, nutrientName, value }; both must work.
  assert.equal(food.per100g?.calories, 357);
  assert.equal(food.per100g?.proteinG, 21.4);
  assert.ok(calls[0].includes("format=abridged"));

  await client.getFood("2057648");
  assert.equal(calls.length, 1, "the second lookup should be served from cache");
});

test("the USDA client fails loudly on a missing key and on rate limiting", async () => {
  assert.throws(
    () => new UsdaFdcClient({ apiKey: "" }),
    (error: unknown) => error instanceof FoodDatabaseError && /USDA_FDC_API_KEY/.test(String(error)),
  );

  const limited: typeof fetch = async () => new Response("{}", { status: 429 });
  const client = new UsdaFdcClient({ apiKey: "k", fetchImpl: limited });
  await assert.rejects(client.searchFoods("x"), (error: unknown) => {
    assert.ok(error instanceof FoodDatabaseError);
    assert.equal(error.status, 429);
    return true;
  });
});

test("Open Food Facts resolves a barcode and converts sodium to milligrams", async () => {
  const { impl } = stubFetch([[/product\/3017624010701/, OFF_PRODUCT_RESPONSE]]);
  const client = new OpenFoodFactsClient({ userAgent: "test/1.0", fetchImpl: impl });

  const product = await client.lookupBarcode("3017624010701");
  assert.ok(product);
  assert.equal(product.name, "Nutella");
  assert.equal(product.brand, "Ferrero");
  assert.equal(product.per100g?.calories, 539);
  // sodium_100g is grams per 100 g, so 0.043 g becomes 43 mg.
  assert.equal(product.per100g?.sodiumMg, 43);
  assert.deepEqual(product.servings[0], { label: "15 g", grams: 15 });
});

test("Open Food Facts treats an HTML holding page as an error, not as data", async () => {
  const html: typeof fetch = async () =>
    new Response("<!DOCTYPE html><html>Page temporarily unavailable</html>", {
      status: 200,
      headers: { "content-type": "text/html" },
    });
  const client = new OpenFoodFactsClient({ fetchImpl: html });
  await assert.rejects(client.getFood("3017624010701"), FoodDatabaseError);
});

test("the composite database sends barcodes to Open Food Facts and words to USDA", async () => {
  const usdaStub = stubFetch([[/foods\/search/, FDC_SEARCH_RESPONSE]]);
  const offStub = stubFetch([[/product\/3017624010701/, OFF_PRODUCT_RESPONSE]]);

  const database = new CompositeFoodDatabase(
    new UsdaFdcClient({ apiKey: "test-key", fetchImpl: usdaStub.impl }),
    new OpenFoodFactsClient({ userAgent: "test/1.0", fetchImpl: offStub.impl }),
  );

  const scanned = await database.searchFoods("3017624010701");
  assert.equal(scanned.length, 1);
  assert.equal(scanned[0].provider, "open-food-facts");
  assert.equal(usdaStub.calls.length, 0, "a barcode should not burn a USDA request");

  const typed = await database.searchFoods("cheddar cheese");
  assert.equal(typed[0].provider, "usda-fdc");
  assert.equal(usdaStub.calls.length, 1);
});

test("the composite database routes prefixed ids back to their provider", async () => {
  const usdaStub = stubFetch([[/\/food\/2057648/, FDC_ABRIDGED_FOOD]]);
  const offStub = stubFetch([[/product\/3017624010701/, OFF_PRODUCT_RESPONSE]]);
  const database = new CompositeFoodDatabase(
    new UsdaFdcClient({ apiKey: "test-key", fetchImpl: usdaStub.impl }),
    new OpenFoodFactsClient({ userAgent: "test/1.0", fetchImpl: offStub.impl }),
  );

  const off = await database.getFood("open-food-facts:3017624010701");
  assert.equal(off?.name, "Nutella");
  const usda = await database.getFood("usda-fdc:2057648");
  assert.equal(usda?.providerId, "2057648");
  const bare = await database.getFood("2057648");
  assert.equal(bare?.providerId, "2057648");
});

test("macrosForGrams scales a serving correctly", () => {
  const per100g = { calories: 539, proteinG: 6.3, carbsG: 57.5, fatG: 30.9, sodiumMg: 43 };
  assert.deepEqual(macrosForGrams(per100g, 15), {
    calories: 80.85,
    proteinG: 0.95,
    carbsG: 8.63,
    fatG: 4.64,
    fiberG: undefined,
    sugarG: undefined,
    sodiumMg: 6.45,
  });
});
