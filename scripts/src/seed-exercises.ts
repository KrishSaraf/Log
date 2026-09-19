import { db } from "@workspace/db";
import { exercisesTable } from "@workspace/db/schema";
import { readFileSync } from "fs";

const IMAGE_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";

// Images are at: IMAGE_BASE/{exercise.id}/{number}.jpg
// e.g. exercises/3_4_Sit-Up/0.jpg

const EQUIPMENT_MAP: Record<string, string> = {
  "body only": "body weight",
  "barbell": "barbell",
  "dumbbell": "dumbbell",
  "cable": "cable",
  "machine": "leverage machine",
  "kettlebells": "kettlebell",
  "bands": "resistance band",
  "e-z curl bar": "ez barbell",
  "exercise ball": "stability ball",
  "foam roll": "roller",
  "medicine ball": "medicine ball",
  "other": "body weight",
};

const MUSCLE_TO_BODY_PART: Record<string, string> = {
  abdominals: "waist",
  abductors: "hips",
  adductors: "hips",
  biceps: "upper arms",
  calves: "lower legs",
  chest: "chest",
  forearms: "lower arms",
  glutes: "hips",
  hamstrings: "upper legs",
  lats: "back",
  "lower back": "back",
  "middle back": "back",
  neck: "neck",
  quadriceps: "upper legs",
  shoulders: "shoulders",
  traps: "back",
  triceps: "upper arms",
};

interface RawExercise {
  id: string;
  name: string;
  category: string;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  images: string[];
  level: string;
  force: string | null;
  mechanic: string | null;
}

async function seed() {
  const rawData = readFileSync("/tmp/exercises.json", "utf-8");
  const rawExercises: RawExercise[] = JSON.parse(rawData);

  console.log(`Processing ${rawExercises.length} exercises...`);

  // Clear old data
  await db.delete(exercisesTable);

  const rows = rawExercises.map((ex) => {
    const primaryMuscle = ex.primaryMuscles[0] ?? "other";
    const bodyPart =
      ex.category === "cardio"
        ? "cardio"
        : MUSCLE_TO_BODY_PART[primaryMuscle] ?? "back";

    const equipment = ex.equipment
      ? (EQUIPMENT_MAP[ex.equipment] ?? ex.equipment)
      : "body weight";

    // Images are stored as "ExerciseId/0.jpg" relative to the exercises folder
    // Full URL: IMAGE_BASE/ExerciseId/0.jpg
    const gifUrl = ex.images.length > 0
      ? `${IMAGE_BASE}/${ex.images[0]}`
      : "";

    const allImages = ex.images.map((img) => `${IMAGE_BASE}/${img}`);

    return {
      id: ex.id,
      name: ex.name,
      bodyPart,
      equipment,
      gifUrl,
      target: primaryMuscle,
      secondaryMuscles: ex.secondaryMuscles,
      instructions: ex.instructions,
      images: allImages,
      level: ex.level ?? "beginner",
    };
  });

  // Insert in batches
  const batchSize = 100;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    await db.insert(exercisesTable).values(batch).onConflictDoNothing();
    console.log(`Inserted ${Math.min(i + batchSize, rows.length)}/${rows.length}`);
  }

  console.log("✅ Done! All exercises seeded with real images.");
}

seed().catch(console.error).finally(() => process.exit(0));
