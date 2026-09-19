import { ilike } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, exercises } from "@/db";
import { authErrorResponse, requireUserId } from "@/lib/auth-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIMIT = 40;

export async function GET(req: Request) {
  try {
    await requireUserId(req);
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim() ?? "";

    const rows = q
      ? await db
          .select({
            id: exercises.id,
            name: exercises.name,
            bodyPart: exercises.bodyPart,
            equipment: exercises.equipment,
            target: exercises.target,
            level: exercises.level,
          })
          .from(exercises)
          .where(ilike(exercises.name, `%${escapeIlike(q)}%`))
          .orderBy(exercises.name)
          .limit(LIMIT)
      : await db
          .select({
            id: exercises.id,
            name: exercises.name,
            bodyPart: exercises.bodyPart,
            equipment: exercises.equipment,
            target: exercises.target,
            level: exercises.level,
          })
          .from(exercises)
          .orderBy(exercises.name)
          .limit(LIMIT);

    return NextResponse.json({ items: rows, q, limit: LIMIT });
  } catch (err) {
    return (
      authErrorResponse(err) ??
      NextResponse.json({ error: "Could not search exercises." }, { status: 500 })
    );
  }
}

function escapeIlike(value: string) {
  return value.replace(/[%_\\]/g, "\\$&");
}
