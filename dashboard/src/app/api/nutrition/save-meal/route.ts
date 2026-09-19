import { NextResponse } from "next/server";

import { db, foodEntries, meals } from "@/db";
import { AuthRequiredError, requireUserId } from "@/lib/auth-user";
import { todayIso } from "@/lib/format";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = (await req.json()) as {
      date?: string;
      mealName?: string | null;
      mealType?: "breakfast" | "lunch" | "dinner" | "snack";
      notes?: string | null;
      foods?: Array<{
        name: string;
        quantity?: number | null;
        unit?: string | null;
        calories?: number | null;
        proteinG?: number | null;
        carbsG?: number | null;
        fatG?: number | null;
      }>;
    };

    if (!body.foods?.length) {
      return NextResponse.json({ error: "Add at least one food." }, { status: 400 });
    }

    const date = body.date && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : todayIso();

    const meal = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(meals)
        .values({
          userId,
          date,
          name: body.mealName ?? "Meal",
          mealType: body.mealType ?? "snack",
          notes: body.notes ?? null,
          source: "photo",
        })
        .returning();

      await tx.insert(foodEntries).values(
        body.foods!.map((food) => ({
          mealId: row.id,
          name: food.name,
          quantity: food.quantity != null ? String(food.quantity) : null,
          unit: food.unit ?? null,
          calories: food.calories != null ? String(food.calories) : null,
          proteinG: food.proteinG != null ? String(food.proteinG) : null,
          carbsG: food.carbsG != null ? String(food.carbsG) : null,
          fatG: food.fatG != null ? String(food.fatG) : null,
        })),
      );

      return row;
    });

    return NextResponse.json({ mealId: meal.id, date: meal.date });
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : "Could not save meal.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
