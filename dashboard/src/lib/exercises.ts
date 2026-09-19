import { and, count, eq, ilike, type SQL } from "drizzle-orm";

import { db, exercises } from "@/db";
import type {
  ExerciseFilters,
  ExerciseQuery,
  ExerciseRecord,
} from "@/lib/exercise-display";

export const EXERCISE_PAGE_SIZE = 24;

export type { ExerciseFilters, ExerciseQuery, ExerciseRecord };

export type ExerciseListResult = {
  items: ExerciseRecord[];
  total: number;
  page: number;
  totalPages: number;
};

function escapeIlike(value: string) {
  return value.replace(/[%_\\]/g, "\\$&");
}

function whereFromQuery(query: ExerciseQuery): SQL | undefined {
  const conditions: SQL[] = [];
  const search = query.search?.trim();
  if (search) {
    conditions.push(ilike(exercises.name, `%${escapeIlike(search)}%`));
  }
  if (query.bodyPart) {
    conditions.push(eq(exercises.bodyPart, query.bodyPart));
  }
  if (query.equipment) {
    conditions.push(eq(exercises.equipment, query.equipment));
  }
  return conditions.length > 0 ? and(...conditions) : undefined;
}

export async function listExercises(
  query: ExerciseQuery,
): Promise<ExerciseListResult> {
  const page = Math.max(1, query.page ?? 1);
  const where = whereFromQuery(query);

  const [totalRow, items] = await Promise.all([
    db.select({ n: count() }).from(exercises).where(where),
    db
      .select()
      .from(exercises)
      .where(where)
      .orderBy(exercises.name)
      .limit(EXERCISE_PAGE_SIZE)
      .offset((page - 1) * EXERCISE_PAGE_SIZE),
  ]);

  const total = totalRow[0]?.n ?? 0;
  return {
    items,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / EXERCISE_PAGE_SIZE)),
  };
}

export async function getExerciseFilters(): Promise<ExerciseFilters> {
  const [bodyPartRows, equipmentRows] = await Promise.all([
    db
      .selectDistinct({ value: exercises.bodyPart })
      .from(exercises)
      .orderBy(exercises.bodyPart),
    db
      .selectDistinct({ value: exercises.equipment })
      .from(exercises)
      .orderBy(exercises.equipment),
  ]);

  return {
    bodyParts: bodyPartRows.map((row) => row.value).filter(Boolean),
    equipment: equipmentRows.map((row) => row.value).filter(Boolean),
  };
}
