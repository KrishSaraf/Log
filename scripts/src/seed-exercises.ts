import { db } from "@workspace/db";
import { exercisesTable } from "@workspace/db/schema";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

interface SeedExercise {
  id: string;
  name: string;
  bodyPart: string;
  equipment: string;
  target: string;
  level?: string;
  gifUrl?: string;
  images?: string[];
  instructions?: string[];
  secondaryMuscles?: string[];
}

function resolveSeedPath(): string {
  const fromEnv = process.env.EXERCISES_JSON;
  if (fromEnv && existsSync(fromEnv)) return fromEnv;

  const candidates = [
    resolve(process.cwd(), "ios/Log/Resources/exercises.json"),
    resolve(process.cwd(), "../ios/Log/Resources/exercises.json"),
    resolve(import.meta.dirname, "../../ios/Log/Resources/exercises.json"),
    "/tmp/exercises.json",
  ];
  const found = candidates.find((p) => existsSync(p));
  if (!found) {
    throw new Error(
      "No exercises.json found. Set EXERCISES_JSON or place data at ios/Log/Resources/exercises.json",
    );
  }
  return found;
}

async function seed() {
  const path = resolveSeedPath();
  console.log(`Seeding from ${path}`);
  const raw: SeedExercise[] = JSON.parse(readFileSync(path, "utf-8"));
  console.log(`Processing ${raw.length} exercises...`);

  await db.delete(exercisesTable);

  const rows = raw.map((ex) => ({
    id: ex.id,
    name: ex.name,
    bodyPart: ex.bodyPart,
    equipment: ex.equipment,
    gifUrl: ex.gifUrl ?? ex.images?.[0] ?? "",
    target: ex.target,
    secondaryMuscles: ex.secondaryMuscles ?? [],
    instructions: ex.instructions ?? [],
    images: ex.images ?? (ex.gifUrl ? [ex.gifUrl] : []),
    level: ex.level ?? "beginner",
  }));

  const batchSize = 100;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    await db.insert(exercisesTable).values(batch).onConflictDoNothing();
    console.log(`Inserted ${Math.min(i + batchSize, rows.length)}/${rows.length}`);
  }

  console.log("✅ Done! Exercise library seeded.");
}

seed()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
