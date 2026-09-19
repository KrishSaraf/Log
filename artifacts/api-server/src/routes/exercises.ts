import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { exercisesTable } from "@workspace/db/schema";
import {
  ListExercisesQueryParams,
  GetExerciseParams,
  GetExerciseFiltersResponse,
  ListExercisesResponse,
  GetExerciseResponse,
} from "@workspace/api-zod";
import { ilike, and, eq, or, sql, count } from "drizzle-orm";

const router: IRouter = Router();

router.get("/filters", async (req, res) => {
  try {
    const bodyParts = await db
      .selectDistinct({ bodyPart: exercisesTable.bodyPart })
      .from(exercisesTable)
      .orderBy(exercisesTable.bodyPart);

    const equipment = await db
      .selectDistinct({ equipment: exercisesTable.equipment })
      .from(exercisesTable)
      .orderBy(exercisesTable.equipment);

    const data = GetExerciseFiltersResponse.parse({
      bodyParts: bodyParts.map((r) => r.bodyPart),
      equipment: equipment.map((r) => r.equipment),
    });

    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Failed to get filters");
    res.status(500).json({ error: "internal_error", message: "Failed to get filters" });
  }
});

router.get("/", async (req, res) => {
  try {
    const parsed = ListExercisesQueryParams.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_params", message: parsed.error.message });
      return;
    }

    const { search, bodyPart, equipment, page, limit } = parsed.data;
    const offset = ((page ?? 1) - 1) * (limit ?? 24);
    const pageSize = limit ?? 24;

    const conditions = [];
    if (search) {
      conditions.push(ilike(exercisesTable.name, `%${search}%`));
    }
    if (bodyPart) {
      conditions.push(eq(exercisesTable.bodyPart, bodyPart));
    }
    if (equipment) {
      conditions.push(eq(exercisesTable.equipment, equipment));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult, exercises] = await Promise.all([
      db
        .select({ count: count() })
        .from(exercisesTable)
        .where(whereClause),
      db
        .select()
        .from(exercisesTable)
        .where(whereClause)
        .orderBy(exercisesTable.name)
        .limit(pageSize)
        .offset(offset),
    ]);

    const total = totalResult[0]?.count ?? 0;
    const totalPages = Math.ceil(total / pageSize);

    const data = ListExercisesResponse.parse({
      exercises: exercises.map((e) => ({
        id: e.id,
        name: e.name,
        bodyPart: e.bodyPart,
        equipment: e.equipment,
        gifUrl: e.gifUrl,
        target: e.target,
        secondaryMuscles: e.secondaryMuscles ?? [],
        instructions: e.instructions ?? [],
        images: e.images ?? [],
        level: e.level ?? "beginner",
      })),
      total,
      page: page ?? 1,
      limit: pageSize,
      totalPages,
    });

    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Failed to list exercises");
    res.status(500).json({ error: "internal_error", message: "Failed to list exercises" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const parsed = GetExerciseParams.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_params", message: parsed.error.message });
      return;
    }

    const exercise = await db
      .select()
      .from(exercisesTable)
      .where(eq(exercisesTable.id, parsed.data.id))
      .limit(1);

    if (!exercise[0]) {
      res.status(404).json({ error: "not_found", message: "Exercise not found" });
      return;
    }

    const e = exercise[0];
    const data = GetExerciseResponse.parse({
      id: e.id,
      name: e.name,
      bodyPart: e.bodyPart,
      equipment: e.equipment,
      gifUrl: e.gifUrl,
      target: e.target,
      secondaryMuscles: e.secondaryMuscles ?? [],
      instructions: e.instructions ?? [],
      images: e.images ?? [],
      level: e.level ?? "beginner",
    });

    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Failed to get exercise");
    res.status(500).json({ error: "internal_error", message: "Failed to get exercise" });
  }
});

export default router;
