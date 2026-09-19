import { z } from "zod";

import { extractJsonObject, nimChat, toDataUrl, type NimMessage } from "./client";
import { enrichMealDraft } from "./food-enrich";

const foodItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().positive().nullable().optional(),
  unit: z.string().nullable().optional(),
  calories: z.coerce.number().nonnegative().nullable(),
  proteinG: z.coerce.number().nonnegative().nullable(),
  carbsG: z.coerce.number().nonnegative().nullable(),
  fatG: z.coerce.number().nonnegative().nullable(),
  brand: z.string().nullable().optional(),
  barcode: z.string().nullable().optional(),
  packaged: z.boolean().optional(),
  searchQuery: z.string().nullable().optional(),
  confidence: z.coerce.number().min(0).max(1).optional(),
  notes: z.string().nullable().optional(),
});

const mealDraftSchema = z.object({
  mealName: z.string().nullable().optional(),
  mealType: z
    .string()
    .optional()
    .transform((value) => {
      const s = (value ?? "").toLowerCase();
      if (s === "breakfast" || s === "lunch" || s === "dinner" || s === "snack") return s;
      return "snack";
    }),
  foods: z.array(foodItemSchema).min(1),
  assumptions: z.array(z.string()).optional(),
  overallConfidence: z.coerce.number().min(0).max(1).optional(),
});

export type FoodItemDraft = z.infer<typeof foodItemSchema>;
export type MealDraft = z.infer<typeof mealDraftSchema>;

const SYSTEM = `You estimate nutrition from a photo of food for a personal tracker.
Return ONLY a JSON object with this shape:
{
  "mealName": string | null,
  "mealType": "breakfast" | "lunch" | "dinner" | "snack",
  "foods": [
    {
      "name": string,
      "quantity": number | null,
      "unit": string | null,
      "calories": number,
      "proteinG": number,
      "carbsG": number,
      "fatG": number,
      "brand": string | null,
      "barcode": string | null,
      "packaged": boolean,
      "searchQuery": string | null,
      "confidence": number,
      "notes": string | null
    }
  ],
  "assumptions": string[],
  "overallConfidence": number
}
Rules:
- Always fill calories, proteinG, carbsG, and fatG for the portion you see. Never leave those four null.
- If it is a packaged / branded product (noodles, shake, bar, yogurt, drink), set packaged true, copy the brand and product name from the label, put a searchQuery like "Yakult original 80ml" or "YiB instant noodles chicken", and copy a barcode if it is readable.
- Macros are for the portion shown, not per 100 g, unless the label is clearly per 100 g and the whole pack is that size.
- Split mixed plates into items when possible.
- Do not wrap the JSON in markdown.`;

async function parseMealReply(reply: string) {
  try {
    return mealDraftSchema.parse(extractJsonObject(reply));
  } catch {
    /* Vision models often write markdown. */
  }

  try {
    const converted = await nimChat({
      messages: [
        {
          role: "system",
          content:
            'Convert nutrition notes into JSON only: {"mealName":string,"mealType":"breakfast"|"lunch"|"dinner"|"snack","foods":[{"name":string,"calories":number,"proteinG":number,"carbsG":number,"fatG":number}]}. No markdown.',
        },
        { role: "user", content: reply.slice(0, 4000) },
      ],
      temperature: 0,
      maxTokens: 1200,
      timeoutSec: 20,
    });
    return mealDraftSchema.parse(extractJsonObject(converted));
  } catch {
    /* last resort: pull name + numbers from the prose */
  }

  const guessed = mealFromProse(reply);
  if (guessed) return mealDraftSchema.parse(guessed);
  throw new Error("Couldn't read that photo.");
}

function mealFromProse(text: string) {
  const name =
    text.match(/meal\s*name[:\s*]+([A-Za-z][^\n*]{2,70})/i)?.[1]?.trim() ??
    text.match(/\*\*([A-Za-z][^:*]{3,50})\*\*/)?.[1]?.trim();
  const calories =
    Number(text.match(/(\d{2,4})\s*(?:kcal|calories)/i)?.[1] ?? "") || null;
  const protein =
    Number(text.match(/(\d{1,3})\s*g?\s*protein/i)?.[1] ?? "") || 0;
  const carbs =
    Number(text.match(/(\d{1,3})\s*g?\s*carb/i)?.[1] ?? "") || 0;
  const fat = Number(text.match(/(\d{1,3})\s*g?\s*fat/i)?.[1] ?? "") || 0;
  if (!name && calories == null) return null;
  return {
    mealName: name || "Meal",
    mealType: "lunch",
    foods: [
      {
        name: name || "Meal",
        calories: calories ?? 400,
        proteinG: protein,
        carbsG: carbs,
        fatG: fat,
      },
    ],
  };
}

export async function analyzeFoodPhoto(input: {
  imageBase64: string;
  mimeType?: string;
  hint?: string;
}): Promise<MealDraft> {
  const imageUrl = toDataUrl(input.imageBase64, input.mimeType ?? "image/jpeg");
  const userText = input.hint?.trim()
    ? `Estimate calories and macros for this meal. Extra context from me: ${input.hint.trim()}`
    : "Estimate calories and macros for everything visible on this plate / package.";

  const messages: NimMessage[] = [
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content: [
        { type: "text", text: userText },
        { type: "image_url", image_url: { url: imageUrl } },
      ],
    },
  ];

  const reply = await nimChat({
    messages,
    temperature: 0.1,
    maxTokens: 1800,
    timeoutSec: 40,
  });
  const parsed = await parseMealReply(reply);
  const draft: MealDraft = {
    ...parsed,
    mealType: parsed.mealType ?? "snack",
    foods: parsed.foods.map((food) => ({
      ...food,
      calories: food.calories ?? 0,
      proteinG: food.proteinG ?? 0,
      carbsG: food.carbsG ?? 0,
      fatG: food.fatG ?? 0,
      confidence: food.confidence ?? parsed.overallConfidence ?? 0.5,
    })),
  };
  return enrichMealDraft(draft);
}
