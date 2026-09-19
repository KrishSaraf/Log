import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, questionResponses, questions } from "@/db";
import { authErrorResponse, requireUserId } from "@/lib/auth-user";
import type { Tick } from "@/lib/habits";
import { todayIso } from "@/lib/format";

export const runtime = "nodejs";

const TICKS = new Set<Tick>(["yes", "partial", "no"]);

type Body = {
  date?: string;
  key?: string;
  tick?: string;
  note?: string | null;
};

export async function POST(req: Request) {
  return upsert(req);
}

export async function PATCH(req: Request) {
  return upsert(req);
}

async function upsert(req: Request) {
  try {
    const userId = await requireUserId(req);
    const body = (await req.json()) as Body;

    const key = body.key?.trim();
    const tick = body.tick?.trim().toLowerCase();
    const date =
      body.date && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : todayIso();

    if (!key) {
      return NextResponse.json({ error: "Missing question key." }, { status: 400 });
    }
    if (!tick || !TICKS.has(tick as Tick)) {
      return NextResponse.json(
        { error: "tick must be yes, partial, or no." },
        { status: 400 },
      );
    }

    const [question] = await db
      .select({ id: questions.id })
      .from(questions)
      .where(and(eq(questions.userId, userId), eq(questions.key, key)))
      .limit(1);

    if (!question) {
      return NextResponse.json({ error: "Unknown habit key." }, { status: 404 });
    }

    const [row] = await db
      .insert(questionResponses)
      .values({
        userId,
        questionId: question.id,
        date,
        valueText: tick,
        valueBool: tick === "yes" ? true : tick === "no" ? false : null,
        valueNumeric: tick === "yes" ? "1" : tick === "partial" ? "0.5" : "0",
        note: body.note ?? null,
      })
      .onConflictDoUpdate({
        target: [
          questionResponses.userId,
          questionResponses.questionId,
          questionResponses.date,
        ],
        set: {
          valueText: tick,
          valueBool: tick === "yes" ? true : tick === "no" ? false : null,
          valueNumeric: tick === "yes" ? "1" : tick === "partial" ? "0.5" : "0",
          note: body.note ?? null,
        },
      })
      .returning({
        id: questionResponses.id,
        questionId: questionResponses.questionId,
        date: questionResponses.date,
        valueText: questionResponses.valueText,
      });

    return NextResponse.json({
      id: row.id,
      questionId: row.questionId,
      key,
      date: row.date,
      tick: row.valueText,
    });
  } catch (err) {
    return (
      authErrorResponse(err) ??
      NextResponse.json({ error: "Could not save habit." }, { status: 500 })
    );
  }
}
