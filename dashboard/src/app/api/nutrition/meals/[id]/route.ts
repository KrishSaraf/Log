import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, meals } from "@/db";
import { authErrorResponse, requireUserId } from "@/lib/auth-user";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const userId = await requireUserId(req);
    const { id } = await ctx.params;

    const [row] = await db
      .delete(meals)
      .where(and(eq(meals.id, id), eq(meals.userId, userId)))
      .returning({ id: meals.id });

    if (!row) {
      return NextResponse.json({ error: "Meal not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, id: row.id });
  } catch (err) {
    return (
      authErrorResponse(err) ??
      NextResponse.json({ error: "Could not remove that meal." }, { status: 500 })
    );
  }
}
