import { and, eq, ilike } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, meals } from "@/db";
import { authErrorResponse, requireUserId } from "@/lib/auth-user";

export const runtime = "nodejs";

/** Remove meals by date + name when the phone never got a remote id. */
export async function DELETE(req: Request) {
  try {
    const userId = await requireUserId(req);
    const url = new URL(req.url);
    const date = url.searchParams.get("date")?.trim() ?? "";
    const name = url.searchParams.get("name")?.trim() ?? "";

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !name) {
      return NextResponse.json({ error: "Need a day and a name." }, { status: 400 });
    }

    const removed = await db
      .delete(meals)
      .where(
        and(eq(meals.userId, userId), eq(meals.date, date), ilike(meals.name, name)),
      )
      .returning({ id: meals.id });

    return NextResponse.json({ ok: true, count: removed.length });
  } catch (err) {
    return (
      authErrorResponse(err) ??
      NextResponse.json({ error: "Could not remove that meal." }, { status: 500 })
    );
  }
}
