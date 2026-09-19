import { NextResponse } from "next/server";

import { db, healthMetrics } from "@/db";
import { authErrorResponse, requireUserId } from "@/lib/auth-user";
import { todayIso, toNumber } from "@/lib/format";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const userId = await requireUserId(req);
    const body = (await req.json()) as {
      date?: string;
      kg?: number | string;
      value?: number | string;
      metric?: string;
      unit?: string | null;
      source?: "manual" | "import" | "apple_health";
    };

    const metric = body.metric?.trim() || "weight_kg";
    const raw = body.kg ?? body.value;
    const value = toNumber(raw ?? null);
    const date =
      body.date && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : todayIso();

    if (value === null) {
      return NextResponse.json({ error: "Missing weight value." }, { status: 400 });
    }

    const source = body.source === "apple_health" || body.source === "import"
      ? body.source
      : "manual";

    const [row] = await db
      .insert(healthMetrics)
      .values({
        userId,
        date,
        metric,
        value: String(value),
        unit: body.unit ?? (metric === "weight_kg" ? "kg" : null),
        source,
      })
      .onConflictDoUpdate({
        target: [
          healthMetrics.userId,
          healthMetrics.date,
          healthMetrics.metric,
          healthMetrics.source,
        ],
        set: {
          value: String(value),
          unit: body.unit ?? (metric === "weight_kg" ? "kg" : null),
        },
      })
      .returning({
        id: healthMetrics.id,
        date: healthMetrics.date,
        metric: healthMetrics.metric,
        value: healthMetrics.value,
      });

    return NextResponse.json({
      id: row.id,
      date: row.date,
      metric: row.metric,
      value: toNumber(row.value),
    });
  } catch (err) {
    return (
      authErrorResponse(err) ??
      NextResponse.json({ error: "Could not save reading." }, { status: 500 })
    );
  }
}
