import { and, count, eq, gte } from "drizzle-orm";

import { db, questionResponses, questions } from "@/db";
import { addDaysIso } from "@/lib/habit-chain";
import type { Tick } from "@/lib/habits";
import { todayIso } from "@/lib/format";

/** Default habit set for a brand-new account (matches current tracker intent). */
const DEFAULT_HABITS: {
  key: string;
  label: string;
  orderIndex: number;
  isActive?: boolean;
}[] = [
  { key: "gym", label: "Gym", orderIndex: 0 },
  { key: "cardio_sport", label: "Running", orderIndex: 1 },
  { key: "diet", label: "Diet", orderIndex: 2 },
  { key: "protein", label: "Protein", orderIndex: 3 },
  { key: "morning_skincare", label: "Morning skin care", orderIndex: 4 },
  { key: "night_clean", label: "Night clean", orderIndex: 5 },
  { key: "brush", label: "Brush", orderIndex: 6 },
  { key: "m", label: "M", orderIndex: 7 },
  { key: "doc_rehab", label: "Doc Rehab", orderIndex: 8 },
];

/**
 * Per-habit weekly rhythm (Mon=0 … Sun=6). Values feel lived-in without being
 * a perfect streak — gym skips rest days, brush is mostly yes, diet wobbles.
 */
const DEMO_WEEKLY: Record<string, Array<Tick | null>> = {
  gym: ["yes", "yes", "no", "yes", "partial", "no", "no"],
  cardio_sport: ["no", "partial", "no", "yes", "no", "yes", "no"],
  diet: ["yes", "partial", "yes", "partial", "yes", "no", "partial"],
  protein: ["yes", "yes", "yes", "partial", "yes", "yes", "no"],
  morning_skincare: ["yes", "yes", "partial", "yes", "yes", "no", "yes"],
  night_clean: ["yes", "yes", "yes", "yes", "partial", "yes", "yes"],
  brush: ["yes", "yes", "yes", "yes", "yes", "partial", "yes"],
  m: ["no", "yes", "no", "yes", "no", "yes", "no"],
  doc_rehab: ["yes", "no", "yes", "no", "yes", "no", "partial"],
};

const DEMO_DAYS = 18;

function tickValues(tick: Tick) {
  return {
    valueText: tick,
    valueBool: tick === "yes" ? true : tick === "no" ? false : null,
    valueNumeric: tick === "yes" ? "1" : tick === "partial" ? "0.5" : "0",
  };
}

function weekdayIndex(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const day = new Date(y, m - 1, d).getDay(); // 0 Sun
  return day === 0 ? 6 : day - 1; // Mon=0
}

function demoTickFor(key: string, iso: string): Tick | null {
  const pattern = DEMO_WEEKLY[key];
  if (!pattern) return null;
  const base = pattern[weekdayIndex(iso)] ?? null;
  // Light jitter so every week is not identical.
  const [y, m, d] = iso.split("-").map(Number);
  const salt = (y + m * 17 + d * 31 + key.length * 13) % 11;
  if (base === "yes" && salt === 0) return "partial";
  if (base === "no" && salt === 1) return "yes";
  if (base === "partial" && salt === 2) return "yes";
  return base;
}

async function insertDemoHistory(
  userId: string,
  habitRows: { id: string; key: string }[],
) {
  if (habitRows.length === 0) return 0;

  const today = todayIso();
  const values: {
    userId: string;
    questionId: string;
    date: string;
    valueText: string;
    valueBool: boolean | null;
    valueNumeric: string;
  }[] = [];

  for (let offset = DEMO_DAYS - 1; offset >= 0; offset--) {
    const date = addDaysIso(today, -offset);
    for (const habit of habitRows) {
      const tick = demoTickFor(habit.key, date);
      if (!tick) continue;
      // Leave today mostly open so Today UI invites tapping — seed yesterday back.
      if (offset === 0 && (habit.key === "gym" || habit.key === "diet")) {
        continue;
      }
      if (offset === 0 && habit.key === "brush") {
        values.push({
          userId,
          questionId: habit.id,
          date,
          ...tickValues("yes"),
        });
        continue;
      }
      values.push({
        userId,
        questionId: habit.id,
        date,
        ...tickValues(tick),
      });
    }
  }

  if (values.length === 0) return 0;

  // Chunk inserts to stay under parameter limits.
  const chunk = 200;
  for (let i = 0; i < values.length; i += chunk) {
    await db
      .insert(questionResponses)
      .values(values.slice(i, i + chunk))
      .onConflictDoNothing();
  }
  return values.length;
}

/** Create the default habit set (+ demo history) when the user has none. */
export async function seedDefaultHabitsForUser(userId: string) {
  const existing = await db
    .select({ id: questions.id, key: questions.key })
    .from(questions)
    .where(eq(questions.userId, userId))
    .limit(1);
  if (existing.length > 0) return { created: false, history: 0 };

  const inserted = await db
    .insert(questions)
    .values(
      DEFAULT_HABITS.map((h) => ({
        userId,
        key: h.key,
        label: h.label,
        type: "multiple_choice" as const,
        config: {
          choices: [
            { value: "yes", label: "Done" },
            { value: "partial", label: "Partly" },
            { value: "no", label: "Not done" },
          ],
        },
        cadence: "daily" as const,
        isActive: h.isActive ?? true,
        orderIndex: h.orderIndex,
      })),
    )
    .returning({ id: questions.id, key: questions.key });

  const history = await insertDemoHistory(userId, inserted);
  return { created: true, history };
}

/**
 * If the account already has habits but no recent ticks (common after the first
 * seed shipped without history), fill an ~18-day demo so chains feel alive.
 */
export async function seedDemoHabitHistoryIfEmpty(userId: string) {
  const habitRows = await db
    .select({ id: questions.id, key: questions.key })
    .from(questions)
    .where(and(eq(questions.userId, userId), eq(questions.isActive, true)));

  if (habitRows.length === 0) {
    const seeded = await seedDefaultHabitsForUser(userId);
    return { seededQuestions: seeded.created, inserted: seeded.history };
  }

  const since = addDaysIso(todayIso(), -(DEMO_DAYS - 1));
  const [row] = await db
    .select({ n: count() })
    .from(questionResponses)
    .where(
      and(
        eq(questionResponses.userId, userId),
        gte(questionResponses.date, since),
      ),
    );

  if ((row?.n ?? 0) > 0) {
    return { seededQuestions: false, inserted: 0 };
  }

  const inserted = await insertDemoHistory(userId, habitRows);
  return { seededQuestions: false, inserted };
}
