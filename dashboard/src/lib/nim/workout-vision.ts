import { ilike } from "drizzle-orm";
import { z } from "zod";

import { db, exercises } from "@/db";
import { todayIso } from "@/lib/format";

import { extractJsonObject, nimChat, toDataUrl, type NimMessage } from "./client";
import { parseLightWorkout } from "./light-shorthand";

const setSchema = z.object({
  reps: z.number().int().positive().nullable().optional(),
  weightKg: z.number().nonnegative().nullable().optional(),
  durationSeconds: z.number().int().positive().nullable().optional(),
  isWarmup: z.boolean().optional(),
  rpe: z.number().min(1).max(10).nullable().optional(),
});

const exerciseSchema = z.object({
  name: z.string().min(1),
  sets: z.array(setSchema).default([]),
  notes: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

const workoutDraftSchema = z.object({
  name: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  exercises: z.array(exerciseSchema).min(1),
  overallConfidence: z.number().min(0).max(1).optional(),
});

export type WorkoutSetDraft = z.infer<typeof setSchema>;
export type WorkoutExerciseDraft = z.infer<typeof exerciseSchema> & {
  exerciseId: string | null;
  matchedName: string | null;
};
export type WorkoutDraft = {
  name: string | null;
  date: string;
  notes: string | null;
  exercises: WorkoutExerciseDraft[];
  overallConfidence: number;
  source: "photo" | "manual";
};

function expandLabel(label: string) {
  const lower = label.toLowerCase().replace(/\s+/g, " ").trim();
  // Multi-word gym slang first.
  const phrases: [RegExp, string][] = [
    [/\bdb bench\b/g, "dumbbell bench press"],
    [/\bbb bench\b/g, "barbell bench press"],
    [/\bincline db\b/g, "incline dumbbell"],
    [/\brdl\b/g, "romanian deadlift"],
    [/\bohp\b/g, "overhead press"],
    [/\bsldl\b/g, "stiff leg deadlift"],
    [/\blat ?pd\b/g, "lat pulldown"],
    [/\blat pulldown\b/g, "lat pulldown"],
  ];
  let out = lower;
  for (const [re, rep] of phrases) out = out.replace(re, rep);

  const tokens = out.split(/\s+/);
  const single: Record<string, string> = {
    db: "dumbbell",
    bb: "barbell",
    bw: "bodyweight",
    dl: "deadlift",
    pd: "pulldown",
  };
  return tokens
    .map((t) => single[t] ?? t)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

async function matchExercise(label: string): Promise<{ id: string; name: string } | null> {
  const cleaned = expandLabel(label.trim().replace(/\s+/g, " "));
  if (!cleaned) return null;

  const exact = await db
    .select({ id: exercises.id, name: exercises.name })
    .from(exercises)
    .where(ilike(exercises.name, cleaned))
    .limit(1);
  if (exact[0]) return exact[0];

  const tokens = cleaned
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2)
    .slice(0, 4);
  if (tokens.length === 0) return null;

  // Prefer the most distinctive tokens last (e.g. romanian deadlift).
  const pattern = `%${tokens.join("%")}%`;
  const likeOnly = await db
    .select({ id: exercises.id, name: exercises.name })
    .from(exercises)
    .where(ilike(exercises.name, pattern))
    .limit(12);

  if (likeOnly.length === 0) {
    // Broader: any token
    const loose = await db
      .select({ id: exercises.id, name: exercises.name })
      .from(exercises)
      .where(ilike(exercises.name, `%${tokens[tokens.length - 1]}%`))
      .limit(12);
    if (loose.length === 0) return null;
    return scoreMatches(cleaned, tokens, loose);
  }
  return scoreMatches(cleaned, tokens, likeOnly);
}

function scoreMatches(
  cleaned: string,
  tokens: string[],
  rows: { id: string; name: string }[],
) {
  const scored = rows
    .map((row) => {
      const n = row.name.toLowerCase();
      const hits = tokens.filter((t) => n.includes(t)).length;
      const startsSoft = n.includes(cleaned) ? 2 : 0;
      const benchBonus =
        cleaned.includes("bench") && n.includes("bench") && n.includes("press")
          ? 2
          : 0;
      const penalty =
        cleaned.includes("bench") && n.includes("rear delt") ? -5 : 0;
      return { row, score: hits + startsSoft + benchBonus + penalty };
    })
    .sort((a, b) => b.score - a.score);
  return scored[0]?.row ?? null;
}

async function attachMatches(
  draft: z.infer<typeof workoutDraftSchema>,
  source: "photo" | "manual",
): Promise<WorkoutDraft> {
  const exercisesOut: WorkoutExerciseDraft[] = [];
  for (const ex of draft.exercises) {
    let match: { id: string; name: string } | null = null;
    try {
      match = await matchExercise(ex.name);
    } catch {
      match = await db
        .select({ id: exercises.id, name: exercises.name })
        .from(exercises)
        .where(ilike(exercises.name, `%${ex.name.split(/\s+/).slice(0, 2).join("%")}%`))
        .limit(1)
        .then((rows) => rows[0] ?? null);
    }
    exercisesOut.push({
      ...ex,
      sets: ex.sets ?? [],
      exerciseId: match?.id ?? null,
      matchedName: match?.name ?? null,
      confidence: ex.confidence ?? draft.overallConfidence ?? 0.5,
    });
  }

  return {
    name: draft.name ?? exercisesOut[0]?.name ?? "Workout",
    date: draft.date && /^\d{4}-\d{2}-\d{2}$/.test(draft.date) ? draft.date : todayIso(),
    notes: draft.notes ?? null,
    exercises: exercisesOut,
    overallConfidence: draft.overallConfidence ?? 0.5,
    source,
  };
}

const MACHINE_SYSTEM = `You identify gym machines / stations from a photo for a personal workout log.
Return ONLY JSON:
{
  "name": string | null,
  "date": "YYYY-MM-DD" | null,
  "notes": string | null,
  "exercises": [
    {
      "name": string,
      "sets": [{"reps": number|null, "weightKg": number|null, "durationSeconds": number|null, "isWarmup": boolean, "rpe": number|null}],
      "notes": string | null,
      "confidence": number
    }
  ],
  "overallConfidence": number
}
Rules:
- Name the primary exercise the machine is for (e.g. "Seated Chest Press", "Lat Pulldown").
- If the photo shows a weight stack / plate / screen with a load or last set, fill sets; otherwise sets may be [].
- Prefer common gym exercise names. Do not invent a long history of sets you cannot see.
- No markdown.`;

const TEXT_SYSTEM = `You turn a free-text workout note into structured JSON for a personal log.
Return ONLY JSON:
{
  "name": string | null,
  "date": "YYYY-MM-DD" | null,
  "notes": string | null,
  "exercises": [
    {
      "name": string,
      "sets": [{"reps": number|null, "weightKg": number|null, "durationSeconds": number|null, "isWarmup": boolean, "rpe": number|null}],
      "notes": string | null,
      "confidence": number
    }
  ],
  "overallConfidence": number
}
Rules:
- Expand shorthand like "bench 3x8 @60kg", "db press 12,10,8", "ohp 40kg x5".
- When the user says "3 sets of 10" or "3x10", emit THREE set objects each with reps 10 (same weight), not one.
- Weights default to kilograms unless lb/lbs is written.
- One exercise object per movement. Keep order as written.
- No markdown.`;

export async function analyzeMachinePhoto(input: {
  imageBase64: string;
  mimeType?: string;
  hint?: string;
}): Promise<WorkoutDraft> {
  const imageUrl = toDataUrl(input.imageBase64, input.mimeType ?? "image/jpeg");
  const userText = input.hint?.trim()
    ? `What machine / exercise is this? Extra context: ${input.hint.trim()}`
    : "What machine / exercise is this? If any weight or reps are visible, include them.";

  const messages: NimMessage[] = [
    { role: "system", content: MACHINE_SYSTEM },
    {
      role: "user",
      content: [
        { type: "text", text: userText },
        { type: "image_url", image_url: { url: imageUrl } },
      ],
    },
  ];

  const reply = await nimChat({
    messages,
    temperature: 0.1,
    maxTokens: 1600,
    timeoutSec: 55,
  });
  let parsed: z.infer<typeof workoutDraftSchema>;
  try {
    parsed = workoutDraftSchema.parse(extractJsonObject(reply));
  } catch {
    const hint = input.hint?.trim();
    if (!hint) throw new Error("Couldn't read that photo.");
    parsed = {
      name: hint,
      date: null,
      notes: null,
      exercises: [{ name: hint, sets: [], notes: null, confidence: 0.3 }],
      overallConfidence: 0.3,
    };
  }
  return attachMatches(parsed, "photo");
}

export async function analyzeWorkoutText(input: {
  text: string;
  date?: string;
}): Promise<WorkoutDraft> {
  const text = input.text.trim();
  if (!text) throw new Error("Write what you did first.");

  // Fast path: structured shorthand never needs the model.
  const light = parseLightWorkout(text);
  if (light && light.exercises.length > 0) {
    return attachMatches(
      {
        name: light.name,
        date: input.date ?? todayIso(),
        notes: null,
        exercises: light.exercises.map((ex) => ({
          name: ex.name,
          sets: ex.sets.map((set) => ({
            reps: set.reps,
            weightKg: set.weightKg,
            durationSeconds: null,
            isWarmup: set.isWarmup,
            rpe: null,
          })),
          notes: null,
          confidence: 0.9,
        })),
        overallConfidence: 0.9,
      },
      "manual",
    );
  }

  const messages: NimMessage[] = [
    { role: "system", content: TEXT_SYSTEM },
    {
      role: "user",
      content: `Today is ${input.date ?? todayIso()}. Parse this workout:\n\n${text}`,
    },
  ];
  const reply = await nimChat({ messages, temperature: 0.1, maxTokens: 1600 });
  const parsed = workoutDraftSchema.parse(extractJsonObject(reply));
  if (input.date && !parsed.date) parsed.date = input.date;
  return attachMatches(parsed, "manual");
}
