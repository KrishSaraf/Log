import { NextResponse } from "next/server";

import { db, workoutExercises, workouts, workoutSets } from "@/db";
import { todayIso } from "@/lib/format";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      name?: string | null;
      date?: string;
      notes?: string | null;
      source?: "manual" | "photo";
      exercises?: Array<{
        name: string;
        exerciseId?: string | null;
        notes?: string | null;
        sets?: Array<{
          reps?: number | null;
          weightKg?: number | null;
          durationSeconds?: number | null;
          isWarmup?: boolean;
          rpe?: number | null;
        }>;
      }>;
    };

    if (!body.exercises?.length) {
      return NextResponse.json({ error: "Add at least one exercise." }, { status: 400 });
    }

    const date = body.date && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : todayIso();
    const source = body.source === "photo" ? "photo" : "manual";
    const baseName = (body.name?.trim() || body.exercises[0]?.name || "Workout").slice(0, 100);

    const workoutId = await db.transaction(async (tx) => {
      let finalName = baseName;
      let inserted: { id: string } | null = null;

      for (let attempt = 0; attempt < 6; attempt += 1) {
        try {
          const [row] = await tx
            .insert(workouts)
            .values({
              date,
              name: finalName,
              notes: body.notes ?? null,
              source,
            })
            .returning({ id: workouts.id });
          inserted = row;
          break;
        } catch {
          finalName = `${baseName} (${attempt + 2})`;
        }
      }

      if (!inserted) throw new Error("Could not create workout row.");

      for (const [orderIndex, ex] of body.exercises!.entries()) {
        const [slot] = await tx
          .insert(workoutExercises)
          .values({
            workoutId: inserted.id,
            exerciseId: ex.exerciseId ?? null,
            customName: ex.exerciseId ? null : ex.name,
            orderIndex,
            notes: ex.notes ?? null,
          })
          .returning({ id: workoutExercises.id });

        const sets = ex.sets?.length
          ? ex.sets
          : [{ reps: null, weightKg: null, durationSeconds: null, isWarmup: false, rpe: null }];

        await tx.insert(workoutSets).values(
          sets.map((set, setIndex) => ({
            workoutExerciseId: slot.id,
            setIndex,
            reps: set.reps ?? null,
            weightKg: set.weightKg != null ? String(set.weightKg) : null,
            durationSeconds: set.durationSeconds ?? null,
            rpe: set.rpe != null ? String(set.rpe) : null,
            isWarmup: set.isWarmup ?? false,
            completed: true,
          })),
        );
      }

      return inserted.id;
    });

    return NextResponse.json({ workoutId, date, name: baseName });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save workout.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
