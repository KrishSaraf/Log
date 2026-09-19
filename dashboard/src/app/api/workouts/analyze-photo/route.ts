import { NextResponse } from "next/server";

import { readPhotoBody } from "@/lib/nim/photo-body";
import { analyzeMachinePhoto } from "@/lib/nim/workout-vision";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await readPhotoBody(req);
    const draft = await analyzeMachinePhoto(body);
    return NextResponse.json({ draft });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not read machine photo.";
    const status = /missing image|too large|not an image|HEIC/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
