import { z } from "zod";

import { extractJsonObject, nimChat, toDataUrl, type NimMessage } from "./client";

const foodItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().positive().nullable().optional(),
  unit: z.string().nullable().optional(),
  calories: z.number().nonnegative().nullable(),
  proteinG: z.number().nonnegative().nullable(),
  carbsG: z.number().nonnegative().nullable(),
  fatG: z.number().nonnegative().nullable(),
  confidence: z.number().min(0).max(1).optional(),
  notes: z.string().nullable().optional(),
});

const mealDraftSchema = z.object({
  mealName: z.string().nullable().optional(),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional(),
  foods: z.array(foodItemSchema).min(1),
  assumptions: z.array(z.string()).optional(),
  overallConfidence: z.number().min(0).max(1).optional(),
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
      "calories": number | null,
      "proteinG": number | null,
      "carbsG": number | null,
      "fatG": number | null,
      "confidence": number,
      "notes": string | null
    }
  ],
  "assumptions": string[],
  "overallConfidence": number
}
Rules:
- Identify distinct foods / dishes you can see. Split mixed plates into items when possible.
- Macros and calories are estimates for the portion shown, not per-100g unless that is all you can infer.
- Prefer honest nulls over invented precision. If a food is unclear, still list it with lower confidence.
- Use grams / ml / pieces as units when sensible.
- Do not wrap the JSON in markdown.`;

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

  const reply = await nimChat({ messages, temperature: 0.1, maxTokens: 1800 });
  const parsed = mealDraftSchema.parse(extractJsonObject(reply));
  return {
    ...parsed,
    mealType: parsed.mealType ?? "snack",
    foods: parsed.foods.map((food) => ({
      ...food,
      confidence: food.confidence ?? parsed.overallConfidence ?? 0.5,
    })),
  };
}
