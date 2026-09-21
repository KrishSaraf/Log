import { asc, count, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import {
  db,
  exercises,
  foodEntries,
  healthMetrics,
  meals,
  questionResponses,
  questions,
  sleepSessions,
  workoutExercises,
  workouts,
  workoutSets,
} from "@/db";
import { authErrorResponse, requireUserId } from "@/lib/auth-user";
import { getExerciseFilters } from "@/lib/exercises";
import { toNumber } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);

    const [
      questionRows,
      responseRows,
      workoutRows,
      mealRows,
      metricRows,
      sleepRows,
      exerciseCountRow,
      filters,
    ] = await Promise.all([
      db
        .select()
        .from(questions)
        .where(eq(questions.userId, userId))
        .orderBy(asc(questions.orderIndex)),
      db
        .select()
        .from(questionResponses)
        .where(eq(questionResponses.userId, userId))
        .orderBy(asc(questionResponses.date)),
      db
        .select()
        .from(workouts)
        .where(eq(workouts.userId, userId))
        .orderBy(asc(workouts.date)),
      db
        .select()
        .from(meals)
        .where(eq(meals.userId, userId))
        .orderBy(asc(meals.date)),
      db
        .select()
        .from(healthMetrics)
        .where(eq(healthMetrics.userId, userId))
        .orderBy(asc(healthMetrics.date)),
      db
        .select()
        .from(sleepSessions)
        .where(eq(sleepSessions.userId, userId))
        .orderBy(asc(sleepSessions.date)),
      db.select({ n: count() }).from(exercises),
      getExerciseFilters(),
    ]);

    const workoutIds = workoutRows.map((row) => row.id);
    const mealIds = mealRows.map((row) => row.id);

    const [exerciseRows, foodRows] = await Promise.all([
      workoutIds.length
        ? db
            .select()
            .from(workoutExercises)
            .where(inArray(workoutExercises.workoutId, workoutIds))
            .orderBy(asc(workoutExercises.orderIndex))
        : Promise.resolve([]),
      mealIds.length
        ? db.select().from(foodEntries).where(inArray(foodEntries.mealId, mealIds))
        : Promise.resolve([]),
    ]);

    const slotIds = exerciseRows.map((row) => row.id);
    const setRows = slotIds.length
      ? await db
          .select()
          .from(workoutSets)
          .where(inArray(workoutSets.workoutExerciseId, slotIds))
          .orderBy(asc(workoutSets.setIndex))
      : [];

    const setsBySlot = groupBy(setRows, (row) => row.workoutExerciseId);
    const slotsByWorkout = groupBy(exerciseRows, (row) => row.workoutId);
    const foodsByMeal = groupBy(foodRows, (row) => row.mealId);

    return NextResponse.json({
      userId,
      questions: questionRows.map((row) => ({
        id: row.id,
        key: row.key,
        label: row.label,
        type: row.type,
        config: row.config,
        cadence: row.cadence,
        isActive: row.isActive,
        orderIndex: row.orderIndex,
      })),
      responses: responseRows.map((row) => ({
        id: row.id,
        questionId: row.questionId,
        date: row.date,
        valueText: row.valueText,
        valueBool: row.valueBool,
        valueNumeric: toNumber(row.valueNumeric),
        note: row.note,
      })),
      workouts: workoutRows.map((row) => ({
        id: row.id,
        date: row.date,
        name: row.name,
        notes: row.notes,
        durationMinutes: row.durationMinutes,
        source: row.source,
        exercises: (slotsByWorkout.get(row.id) ?? []).map((slot) => ({
          id: slot.id,
          exerciseId: slot.exerciseId,
          customName: slot.customName,
          orderIndex: slot.orderIndex,
          notes: slot.notes,
          sets: (setsBySlot.get(slot.id) ?? []).map((set) => ({
            id: set.id,
            setIndex: set.setIndex,
            reps: set.reps,
            weightKg: toNumber(set.weightKg),
            durationSeconds: set.durationSeconds,
            distanceM: toNumber(set.distanceM),
            rpe: toNumber(set.rpe),
            isWarmup: set.isWarmup,
            completed: set.completed,
          })),
        })),
      })),
      meals: mealRows.map((row) => ({
        id: row.id,
        date: row.date,
        name: row.name,
        mealType: row.mealType,
        time: row.time,
        notes: row.notes,
        source: row.source,
        foods: (foodsByMeal.get(row.id) ?? []).map((food) => ({
          id: food.id,
          name: food.name,
          quantity: toNumber(food.quantity),
          unit: food.unit,
          calories: toNumber(food.calories),
          proteinG: toNumber(food.proteinG),
          carbsG: toNumber(food.carbsG),
          fatG: toNumber(food.fatG),
        })),
      })),
      food_entries: foodRows.map((food) => ({
        id: food.id,
        mealId: food.mealId,
        name: food.name,
        quantity: toNumber(food.quantity),
        unit: food.unit,
        calories: toNumber(food.calories),
        proteinG: toNumber(food.proteinG),
        carbsG: toNumber(food.carbsG),
        fatG: toNumber(food.fatG),
      })),
      health_metrics: metricRows.map((row) => ({
        id: row.id,
        date: row.date,
        metric: row.metric,
        value: toNumber(row.value),
        unit: row.unit,
        source: row.source,
        recordedAt: row.recordedAt,
      })),
      sleep_sessions: sleepRows.map((row) => ({
        id: row.id,
        date: row.date,
        totalMinutes: row.totalMinutes,
        quality: row.quality,
        startedAt: row.startedAt,
        endedAt: row.endedAt,
        source: row.source,
        notes: row.notes,
      })),
      exercises: {
        count: exerciseCountRow[0]?.n ?? 0,
        bodyParts: filters.bodyParts,
        equipment: filters.equipment,
      },
    });
  } catch (err) {
    return authErrorResponse(err) ?? NextResponse.json({ error: "Could not load snapshot." }, { status: 500 });
  }
}

function groupBy<T>(rows: T[], key: (row: T) => string) {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    const list = map.get(k);
    if (list) list.push(row);
    else map.set(k, [row]);
  }
  return map;
}
