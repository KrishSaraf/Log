import { NextResponse } from "next/server";

import { nimChat, nimConfig } from "@/lib/nim/client";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Confirms the vision key is configured. Never returns the key itself. */
export async function GET() {
  let nimConfigured = false;
  try {
    nimConfig();
    nimConfigured = true;
  } catch {
    nimConfigured = false;
  }
  return NextResponse.json({
    ok: true,
    nimConfigured,
    time: new Date().toISOString(),
  });
}

/**
 * Optional live ping: POST /api/health?live=1
 * Default POST is a no-network echo so phone checks stay instant.
 */
export async function POST(req: Request) {
  const live = new URL(req.url).searchParams.get("live") === "1";
  if (!live) {
    return GET();
  }

  const started = Date.now();
  try {
    const content = await nimChat({
      messages: [
        { role: "user", content: 'Reply with exactly {"pong":true} and nothing else.' },
      ],
      maxTokens: 16,
      temperature: 0,
    });
    return NextResponse.json({
      ok: true,
      ms: Date.now() - started,
      content: content.slice(0, 80),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        ms: Date.now() - started,
        error: err instanceof Error ? err.message : "failed",
      },
      { status: 500 },
    );
  }
}
