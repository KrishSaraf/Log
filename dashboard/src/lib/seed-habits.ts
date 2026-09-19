import { eq } from "drizzle-orm";

import { db, questions } from "@/db";

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

export async function seedDefaultHabitsForUser(userId: string) {
  const existing = await db
    .select({ id: questions.id })
    .from(questions)
    .where(eq(questions.userId, userId))
    .limit(1);
  if (existing.length > 0) return;

  await db.insert(questions).values(
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
  );
}
