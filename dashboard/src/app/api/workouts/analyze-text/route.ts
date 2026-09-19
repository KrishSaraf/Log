import { NextResponse } from "next/server";

import { AuthRequiredError, requireUserId } from "@/lib/auth-user";
import { analyzeWorkoutText } from "@/lib/nim/workout-vision";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    await requireUserId();
    const body = (await req.json()) as { text?: string; date?: string };
    if (!body.text?.trim()) {
      return NextResponse.json({ error: "Write what you did." }, { status: 400 });
    }
    const draft = await analyzeWorkoutText({ text: body.text, date: body.date });
    return NextResponse.json({ draft });
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : "Could not parse workout.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
