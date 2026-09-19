/**
 * One-shot: print whether vision returns parseable meal JSON. No secrets.
 *   npx tsx scripts/food-photo-check.ts /path/to.jpg
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

for (const line of readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const i = trimmed.indexOf("=");
  if (i < 0) continue;
  const key = trimmed.slice(0, i).trim();
  let value = trimmed.slice(i + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  process.env[key] = value;
}

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("usage: npx tsx scripts/food-photo-check.ts <image>");
    process.exit(1);
  }
  const buf = readFileSync(path);
  const { analyzeFoodPhoto } = await import("../src/lib/nim/food-vision");
  const t = Date.now();
  try {
    const draft = await analyzeFoodPhoto({
      imageBase64: buf.toString("base64"),
      mimeType: "image/jpeg",
    });
    console.log(
      JSON.stringify({
        ms: Date.now() - t,
        mealName: draft.mealName,
        mealType: draft.mealType,
        foods: draft.foods.map((f) => ({
          name: f.name,
          calories: f.calories,
          proteinG: f.proteinG,
        })),
      }),
    );
  } catch (err) {
    console.error("FAIL", err instanceof Error ? err.message.slice(0, 400) : err);
    process.exit(1);
  }
}

main();
