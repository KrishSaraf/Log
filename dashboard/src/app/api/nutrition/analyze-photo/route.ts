import { NextResponse } from "next/server";

import { AuthRequiredError, requireUserId } from "@/lib/auth-user";
import { analyzeFoodPhoto } from "@/lib/nim/food-vision";
import { logPhotoAnalyzeFailure, photoRouteError } from "@/lib/nim/photo-errors";
import { readPhotoBody } from "@/lib/nim/photo-body";

export const runtime = "nodejs";
export const maxDuration = 90;

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
    logPhotoAnalyzeFailure("nutrition/analyze-photo", err);
    const { error, status } = photoRouteError(err);
    return NextResponse.json({ error }, { status });
  }
}
