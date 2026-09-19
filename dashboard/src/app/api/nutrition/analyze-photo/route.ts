import { NextResponse } from "next/server";

import { analyzeFoodPhoto } from "@/lib/nim/food-vision";
import { readPhotoBody } from "@/lib/nim/photo-body";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await readPhotoBody(req);
    const draft = await analyzeFoodPhoto(body);
    return NextResponse.json({ draft });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Food analysis failed.";
    const status = /missing image|too large|not an image|HEIC/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
