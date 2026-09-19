import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, workouts } from "@/db";
import { authErrorResponse, requireUserId } from "@/lib/auth-user";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const userId = await requireUserId(req);
    const { id } = await ctx.params;
    const body = (await req.json()) as {
      name?: string | null;
      date?: string;
      notes?: string | null;
      durationMinutes?: number | null;
    };

    const patch: {
      name?: string | null;
      date?: string;
      notes?: string | null;
      durationMinutes?: number | null;
    } = {};

    if ("name" in body) patch.name = body.name?.trim() ? body.name.trim().slice(0, 100) : null;
    if (body.date && /^\d{4}-\d{2}-\d{2}$/.test(body.date)) patch.date = body.date;
    if ("notes" in body) patch.notes = body.notes ?? null;
    if ("durationMinutes" in body) patch.durationMinutes = body.durationMinutes ?? null;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }

    const [row] = await db
      .update(workouts)
      .set(patch)
      .where(and(eq(workouts.id, id), eq(workouts.userId, userId)))
      .returning({ id: workouts.id, date: workouts.date, name: workouts.name });

    if (!row) {
      return NextResponse.json({ error: "Workout not found." }, { status: 404 });
    }

    return NextResponse.json(row);
  } catch (err) {
    return (
      authErrorResponse(err) ??
      NextResponse.json({ error: "Could not update workout." }, { status: 500 })
    );
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const userId = await requireUserId(req);
    const { id } = await ctx.params;

    const [row] = await db
      .delete(workouts)
      .where(and(eq(workouts.id, id), eq(workouts.userId, userId)))
      .returning({ id: workouts.id });

    if (!row) {
      return NextResponse.json({ error: "Workout not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, id: row.id });
  } catch (err) {
    return (
      authErrorResponse(err) ??
      NextResponse.json({ error: "Could not delete workout." }, { status: 500 })
    );
  }
}
