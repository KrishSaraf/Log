import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { exercisesTable } from "@workspace/db/schema";
import {
  ListExercisesQueryParams,
  GetExerciseParams,
  GetExerciseFiltersResponse,
  ListExercisesResponse,
  GetExerciseResponse,
  CreateExerciseBody,
  UpdateExerciseBody,
  UpdateExerciseResponse,
} from "@workspace/api-zod";
import { ilike, and, eq, or, count, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

const router: IRouter = Router();

function toExercise(e: typeof exercisesTable.$inferSelect) {
  return {
    id: e.id,
    name: e.name,
    bodyPart: e.bodyPart,
    equipment: e.equipment,
    gifUrl: e.gifUrl ?? "",
    target: e.target,
    secondaryMuscles: e.secondaryMuscles ?? [],
    instructions: e.instructions ?? [],
    images: e.images ?? [],
    level: e.level ?? "beginner",
  };
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `${base || "exercise"}-${randomUUID().slice(0, 8)}`;
}

router.get("/filters", async (req, res) => {
  try {
    const [bodyParts, equipment, targets] = await Promise.all([
      db
        .selectDistinct({ bodyPart: exercisesTable.bodyPart })
        .from(exercisesTable)
        .orderBy(exercisesTable.bodyPart),
      db
        .selectDistinct({ equipment: exercisesTable.equipment })
        .from(exercisesTable)
        .orderBy(exercisesTable.equipment),
      db
        .selectDistinct({ target: exercisesTable.target })
        .from(exercisesTable)
        .orderBy(exercisesTable.target),
    ]);

    const data = GetExerciseFiltersResponse.parse({
      bodyParts: bodyParts.map((r) => r.bodyPart),
      equipment: equipment.map((r) => r.equipment),
      targets: targets.map((r) => r.target),
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

    const { search, bodyPart, equipment, target, page, limit } = parsed.data;
    const pageSize = limit ?? 24;
    const offset = ((page ?? 1) - 1) * pageSize;

    const conditions = [];
    if (search) {
      const q = `%${search}%`;
      conditions.push(
        or(ilike(exercisesTable.name, q), ilike(exercisesTable.target, q)),
      );
    }
    if (bodyPart) conditions.push(eq(exercisesTable.bodyPart, bodyPart));
    if (equipment) conditions.push(eq(exercisesTable.equipment, equipment));
    if (target) conditions.push(eq(exercisesTable.target, target));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult, exercises] = await Promise.all([
      db.select({ count: count() }).from(exercisesTable).where(whereClause),
      db
        .select()
        .from(exercisesTable)
        .where(whereClause)
        .orderBy(exercisesTable.name)
        .limit(pageSize)
        .offset(offset),
    ]);

    const total = totalResult[0]?.count ?? 0;

    const data = ListExercisesResponse.parse({
      exercises: exercises.map(toExercise),
      total,
      page: page ?? 1,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize),
    });

    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Failed to list exercises");
    res.status(500).json({ error: "internal_error", message: "Failed to list exercises" });
  }
});

router.post("/", async (req, res) => {
  try {
    const parsed = CreateExerciseBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body", message: parsed.error.message });
      return;
    }

    const input = parsed.data;
    const images = input.images?.length
      ? input.images
      : input.gifUrl
        ? [input.gifUrl]
        : [];
    const gifUrl = input.gifUrl ?? images[0] ?? "";

    const [row] = await db
      .insert(exercisesTable)
      .values({
        id: slugify(input.name),
        name: input.name,
        bodyPart: input.bodyPart,
        equipment: input.equipment,
        gifUrl,
        target: input.target,
        secondaryMuscles: input.secondaryMuscles ?? [],
        instructions: input.instructions ?? [],
        images,
        level: input.level ?? "beginner",
      })
      .returning();

    res.status(201).json(GetExerciseResponse.parse(toExercise(row)));
  } catch (err) {
    req.log.error({ err }, "Failed to create exercise");
    res.status(500).json({ error: "internal_error", message: "Failed to create exercise" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const parsed = GetExerciseParams.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_params", message: parsed.error.message });
      return;
    }

    const [exercise] = await db
      .select()
      .from(exercisesTable)
      .where(eq(exercisesTable.id, parsed.data.id))
      .limit(1);

    if (!exercise) {
      res.status(404).json({ error: "not_found", message: "Exercise not found" });
      return;
    }

    res.json(GetExerciseResponse.parse(toExercise(exercise)));
  } catch (err) {
    req.log.error({ err }, "Failed to get exercise");
    res.status(500).json({ error: "internal_error", message: "Failed to get exercise" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const params = GetExerciseParams.safeParse(req.params);
    const body = UpdateExerciseBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({
        error: "invalid_request",
        message: params.success ? body.error!.message : params.error.message,
      });
      return;
    }

    const input = body.data;
    const images = input.images?.length
      ? input.images
      : input.gifUrl
        ? [input.gifUrl]
        : [];
    const gifUrl = input.gifUrl ?? images[0] ?? "";

    const [row] = await db
      .update(exercisesTable)
      .set({
        name: input.name,
        bodyPart: input.bodyPart,
        equipment: input.equipment,
        gifUrl,
        target: input.target,
        secondaryMuscles: input.secondaryMuscles ?? [],
        instructions: input.instructions ?? [],
        images,
        level: input.level ?? "beginner",
        updatedAt: sql`now()`,
      })
      .where(eq(exercisesTable.id, params.data.id))
      .returning();

    if (!row) {
      res.status(404).json({ error: "not_found", message: "Exercise not found" });
      return;
    }

    res.json(UpdateExerciseResponse.parse(toExercise(row)));
  } catch (err) {
    req.log.error({ err }, "Failed to update exercise");
    res.status(500).json({ error: "internal_error", message: "Failed to update exercise" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const parsed = GetExerciseParams.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_params", message: parsed.error.message });
      return;
    }

    const deleted = await db
      .delete(exercisesTable)
      .where(eq(exercisesTable.id, parsed.data.id))
      .returning({ id: exercisesTable.id });

    if (!deleted[0]) {
      res.status(404).json({ error: "not_found", message: "Exercise not found" });
      return;
    }

    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete exercise");
    res.status(500).json({ error: "internal_error", message: "Failed to delete exercise" });
  }
});

export default router;
