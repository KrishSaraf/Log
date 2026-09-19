import { NextResponse } from "next/server";

import { AuthRequiredError, requireUserId } from "@/lib/auth-user";
import { analyzeFoodPhoto } from "@/lib/nim/food-vision";
import { readPhotoBody } from "@/lib/nim/photo-body";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    await requireUserId(req);
    const body = await readPhotoBody(req);
    const draft = await analyzeFoodPhoto(body);
    return NextResponse.json({ draft });
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : "Food analysis failed.";
    const status = /missing image|too large|not an image|HEIC/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
