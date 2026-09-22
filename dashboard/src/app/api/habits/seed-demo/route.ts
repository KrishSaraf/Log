import { NextResponse } from "next/server";

import { authErrorResponse, requireUserId } from "@/lib/auth-user";
import {
  seedDefaultHabitsForUser,
  seedDemoHabitHistoryIfEmpty,
} from "@/lib/seed-habits";

export const runtime = "nodejs";

/** One-tap demo seed so Today / Log habits are never a blank grid. */
export async function POST(req: Request) {
  try {
    const userId = await requireUserId(req);
    const created = await seedDefaultHabitsForUser(userId);
    const history = await seedDemoHabitHistoryIfEmpty(userId);
    return NextResponse.json({
      ok: true,
      createdQuestions: created.created,
      inserted: created.history + history.inserted,
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
