import { NextResponse } from "next/server";

import { analyzeWorkoutText } from "@/lib/nim/workout-vision";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { text?: string; date?: string };
    if (!body.text?.trim()) {
      return NextResponse.json({ error: "Write what you did." }, { status: 400 });
    }
    const draft = await analyzeWorkoutText({ text: body.text, date: body.date });
    return NextResponse.json({ draft });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not parse workout.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
