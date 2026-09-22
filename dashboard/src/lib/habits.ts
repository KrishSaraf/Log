import { and, asc, count, desc, eq } from "drizzle-orm";

import {
  db,
  healthMetrics,
  questionResponses,
  questions,
  workoutExercises,
  workouts,
} from "@/db";
import { daysInclusive, longestStreakFromDates } from "@/lib/habit-chain";
import { todayIso, toNumber } from "@/lib/format";
import { safely } from "@/lib/safe-query";

export type Tick = "yes" | "partial" | "no";

export type HabitQuestion = {
  id: string;
  key: string;
  label: string;
  isActive: boolean;
};

export type HabitCell = {
  tick: Tick;
  note: string | null;
};

export type HabitDay = {
  date: string;
  weightKg: number | null;
  cells: Record<string, HabitCell | undefined>;
};

export type HabitRange = {
  start: string;
  end: string;
  days: HabitDay[];
};

export type WeightPoint = {
  date: string;
  kg: number;
};

export type WorkoutSession = {
  id: string;
  date: string;
  name: string;
  notes: string | null;
  exerciseCount: number;
};

export type HabitsDashboard = {
  questions: HabitQuestion[];
  activeQuestions: HabitQuestion[];
  ranges: HabitRange[];
  weights: WeightPoint[];
  latestWeight: WeightPoint | null;
  daysLogged: number;
  sessions: WorkoutSession[];
};

const EMPTY: HabitsDashboard = {
  questions: [],
  activeQuestions: [],
  ranges: [],
  weights: [],
  latestWeight: null,
  daysLogged: 0,
  sessions: [],
};

/** Treat a missing response as unlogged. Never coerce that into a miss. */
export function tickFromResponse(input: {
  valueText: string | null;
  valueBool: boolean | null;
  valueNumeric: string | null;
}): Tick | null {
  if (input.valueText) {
    const v = input.valueText.toLowerCase();
    if (v === "no") return "no";
    if (v === "partial") return "partial";
    return "yes";
  }
  if (input.valueBool === false) return "no";
  if (input.valueBool === true) return "yes";
  if (input.valueNumeric !== null) {
    const n = Number(input.valueNumeric);
    if (!Number.isFinite(n)) return null;
    if (n === 0) return "no";
    if (n === 0.5) return "partial";
    if (n > 0) return "yes";
  }
  return null;
}

function enumerateDays(start: string, end: string): string[] {
  const days: string[] = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (cursor <= last) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

function splitRanges(dates: string[], gapDays = 21): { start: string; end: string }[] {
  const sorted = [...new Set(dates)].sort();
  if (sorted.length === 0) return [];

  const ranges: { start: string; end: string }[] = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (const current of sorted.slice(1)) {
    const diff = (Date.parse(current) - Date.parse(prev)) / 86_400_000;
    if (diff > gapDays) {
      ranges.push({ start, end: prev });
      start = current;
    }
    prev = current;
  }
  ranges.push({ start, end: prev });
  return ranges;
}

export async function loadHabitsDashboard(userId: string): Promise<HabitsDashboard> {
  const [questionRows, responseRows, weightRows, workoutRows, exerciseCounts] =
    await Promise.all([
    safely(
      () =>
        db
          .select({
            id: questions.id,
            key: questions.key,
            label: questions.label,
            isActive: questions.isActive,
          })
          .from(questions)
          .where(eq(questions.userId, userId))
          .orderBy(asc(questions.orderIndex)),
      [] as HabitQuestion[],
      "habit questions",
    ),
    safely(
      () =>
        db
          .select({
            questionId: questionResponses.questionId,
            date: questionResponses.date,
            valueText: questionResponses.valueText,
            valueBool: questionResponses.valueBool,
            valueNumeric: questionResponses.valueNumeric,
            note: questionResponses.note,
          })
          .from(questionResponses)
          .where(eq(questionResponses.userId, userId)),
      [] as {
        questionId: string;
        date: string;
        valueText: string | null;
        valueBool: boolean | null;
        valueNumeric: string | null;
        note: string | null;
      }[],
      "habit responses",
    ),
    safely(
      () =>
        db
          .select({
            date: healthMetrics.date,
            value: healthMetrics.value,
          })
          .from(healthMetrics)
          .where(
            and(
              eq(healthMetrics.userId, userId),
              eq(healthMetrics.metric, "weight_kg"),
            ),
          )
          .orderBy(asc(healthMetrics.date)),
      [] as { date: string; value: string }[],
      "weight series",
    ),
    safely(
      () =>
        db
          .select({
            id: workouts.id,
            date: workouts.date,
            name: workouts.name,
            notes: workouts.notes,
          })
          .from(workouts)
          .where(eq(workouts.userId, userId))
          .orderBy(desc(workouts.date), asc(workouts.name)),
      [] as { id: string; date: string; name: string | null; notes: string | null }[],
      "workout sessions",
    ),
    safely(
      () =>
        db
          .select({
            workoutId: workoutExercises.workoutId,
            n: count(),
          })
          .from(workoutExercises)
          .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
          .where(eq(workouts.userId, userId))
          .groupBy(workoutExercises.workoutId),
      [] as { workoutId: string; n: number }[],
      "workout exercise counts",
    ),
  ]);

  const countByWorkout = new Map(exerciseCounts.map((row) => [row.workoutId, row.n]));

  if (questionRows.length === 0 && weightRows.length === 0 && workoutRows.length === 0) {
    return EMPTY;
  }

  const questionById = new Map(questionRows.map((q) => [q.id, q]));
  const cellsByDate = new Map<string, Record<string, HabitCell>>();

  for (const row of responseRows) {
    const question = questionById.get(row.questionId);
    if (!question) continue;
    const tick = tickFromResponse(row);
    if (!tick) continue;
    const byQuestion = cellsByDate.get(row.date) ?? {};
    byQuestion[question.key] = { tick, note: row.note };
    cellsByDate.set(row.date, byQuestion);
  }

  const weights: WeightPoint[] = weightRows
    .map((row) => {
      const kg = toNumber(row.value);
      return kg === null ? null : { date: row.date, kg };
    })
    .filter((row): row is WeightPoint => row !== null);

  const weightByDate = new Map(weights.map((row) => [row.date, row.kg]));

  const loggedDates = [
    ...cellsByDate.keys(),
    ...weights.map((row) => row.date),
  ];
  const rangeBounds = splitRanges(loggedDates);

  const ranges: HabitRange[] = rangeBounds
    .map(({ start, end }) => {
      const days = enumerateDays(start, end)
        .reverse()
        .map((date) => ({
          date,
          weightKg: weightByDate.get(date) ?? null,
          cells: cellsByDate.get(date) ?? {},
        }));
      return { start, end, days };
    })
    .reverse();

  return {
    questions: questionRows,
    activeQuestions: questionRows.filter((q) => q.isActive),
    ranges,
    weights,
    latestWeight: weights.at(-1) ?? null,
    daysLogged: new Set(loggedDates).size,
    sessions: workoutRows.map((row) => ({
      id: row.id,
      date: row.date,
      name: row.name?.trim() || "Session",
      notes: row.notes,
      exerciseCount: countByWorkout.get(row.id) ?? 0,
    })),
  };
}

export function habitCompletion(data: HabitsDashboard, key: string) {
  let logged = 0;
  let done = 0;
  for (const range of data.ranges) {
    for (const day of range.days) {
      const cell = day.cells[key];
      if (!cell) continue;
      logged += 1;
      if (cell.tick === "yes" || cell.tick === "partial") done += 1;
    }
  }
  return { logged, done };
}

export function habitBoardStats(data: HabitsDashboard) {
  const keys = data.activeQuestions.map((question) => question.key);
  const filledByKey: Record<string, string[]> = {};
  let completions = 0;
  let first: string | undefined;

  for (const range of data.ranges) {
    for (const day of range.days) {
      if (!first || day.date < first) first = day.date;
      for (const key of keys) {
        const cell = day.cells[key];
        if (!cell) continue;
        if (cell.tick !== "yes" && cell.tick !== "partial") continue;
        completions += 1;
        (filledByKey[key] ??= []).push(day.date);
      }
    }
  }

  const until = todayIso();
  const span = first && first <= until ? daysInclusive(first, until) : 0;
  const expected = keys.length * span;
  const rate = expected > 0 ? completions / expected : 0;
  const best = keys.reduce(
    (max, key) => Math.max(max, longestStreakFromDates(filledByKey[key] ?? [])),
    0,
  );

  return { completions, rate, best };
}
