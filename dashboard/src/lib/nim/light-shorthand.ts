/**
 * Lightweight gym shorthand parser for the hot path.
 * Handles the common cases without pulling in the heavy notation module:
 *   "chest press 3x10 @50kg"
 *   "bench 3x8@60"
 *   "rdl 12,10,8 @80kg"
 *   "ohp 5x5 40kg"
 */

export type LightSet = {
  reps: number | null;
  weightKg: number | null;
  isWarmup: boolean;
};

export type LightExercise = {
  name: string;
  sets: LightSet[];
};

export type LightWorkout = {
  name: string | null;
  exercises: LightExercise[];
};

function toKg(value: number, unit: string | undefined) {
  if (!unit) return value;
  const u = unit.toLowerCase();
  if (u.startsWith("lb") || u === "#") return Math.round(value * 0.453592 * 100) / 100;
  return value;
}

function parseWeightToken(raw: string): { value: number; unit?: string } | null {
  const m = raw.trim().match(/^@?\s*(\d+(?:\.\d+)?)\s*(kg|kgs|lb|lbs|#)?$/i);
  if (!m) return null;
  return { value: Number(m[1]), unit: m[2] };
}

function expandSets(
  count: number,
  reps: number | null,
  weightKg: number | null,
): LightSet[] {
  const n = Math.max(1, Math.min(count, 20));
  return Array.from({ length: n }, () => ({
    reps,
    weightKg,
    isWarmup: false,
  }));
}

/** Parse one line. Returns null if it does not look like structured shorthand. */
export function parseLightLine(line: string): LightExercise | null {
  const cleaned = line.trim().replace(/\s+/g, " ");
  if (!cleaned) return null;

  // name ... NxR @Wkg   OR   name ... NxR Wkg
  let m = cleaned.match(
    /^(.+?)\s+(\d+)\s*[x×*]\s*(\d+)(?:\s*-\s*(\d+))?\s*(?:@\s*)?(\d+(?:\.\d+)?)\s*(kg|kgs|lb|lbs|#)?\s*$/i,
  );
  if (m) {
    const reps = Number(m[3]);
    const weightKg = toKg(Number(m[5]), m[6]);
    return {
      name: m[1].trim(),
      sets: expandSets(Number(m[2]), reps, weightKg),
    };
  }

  // name ... NxR (no weight)
  m = cleaned.match(/^(.+?)\s+(\d+)\s*[x×*]\s*(\d+)(?:\s*-\s*(\d+))?\s*$/i);
  if (m) {
    return {
      name: m[1].trim(),
      sets: expandSets(Number(m[2]), Number(m[3]), null),
    };
  }

  // name ... 12,10,8 @60kg
  m = cleaned.match(
    /^(.+?)\s+(\d+(?:\s*,\s*\d+)+)\s*(?:@\s*)?(\d+(?:\.\d+)?)\s*(kg|kgs|lb|lbs|#)?\s*$/i,
  );
  if (m) {
    const repsList = m[2].split(/\s*,\s*/).map(Number);
    const weightKg = toKg(Number(m[3]), m[4]);
    return {
      name: m[1].trim(),
      sets: repsList.map((reps) => ({ reps, weightKg, isWarmup: false })),
    };
  }

  // name ... 3 sets of 10 at 50kg
  m = cleaned.match(
    /^(.+?)\s+(\d+)\s*sets?\s+of\s+(\d+)\s+(?:at|@)\s+(\d+(?:\.\d+)?)\s*(kg|kgs|lb|lbs|#)?\s*$/i,
  );
  if (m) {
    return {
      name: m[1].trim(),
      sets: expandSets(Number(m[2]), Number(m[3]), toKg(Number(m[4]), m[5])),
    };
  }

  // "3 sets of 10 pull ups" / "three sets of five pull ups"
  m = cleaned.match(
    /^(?:(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+sets?\s+of\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+)(.+)$/i,
  );
  if (m) {
    const sets = wordOrNum(m[1]);
    const reps = wordOrNum(m[2]);
    const name = m[3].trim().replace(/^(of\s+)/i, "");
    if (sets && reps && name) {
      return { name, sets: expandSets(sets, reps, null) };
    }
  }

  // "pull ups 3 sets of 10"
  m = cleaned.match(
    /^(.+?)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+sets?\s+of\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*$/i,
  );
  if (m) {
    const sets = wordOrNum(m[2]);
    const reps = wordOrNum(m[3]);
    if (sets && reps) {
      return { name: m[1].trim(), sets: expandSets(sets, reps, null) };
    }
  }

  return null;
}

const WORD_NUM: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

function wordOrNum(raw: string): number | null {
  const t = raw.trim().toLowerCase();
  if (/^\d+$/.test(t)) return Number(t);
  return WORD_NUM[t] ?? null;
}

export function parseLightWorkout(text: string): LightWorkout | null {
  const lines = text
    .split(/\n|;/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;

  const exercises: LightExercise[] = [];
  for (const line of lines) {
    // Also split "then" clauses on a single line for light cases only when both sides parse.
    if (/\bthen\b/i.test(line) && !parseLightLine(line)) {
      const parts = line.split(/\bthen\b/i);
      let ok = true;
      const partExercises: LightExercise[] = [];
      for (const part of parts) {
        const cleaned = part.replace(/^\s*(i did|and)\s+/i, "").trim();
        if (!cleaned) continue;
        const parsed = parseLightLine(cleaned);
        if (!parsed) {
          ok = false;
          break;
        }
        partExercises.push(parsed);
      }
      if (ok && partExercises.length) {
        exercises.push(...partExercises);
        continue;
      }
    }

    const stripped = line.replace(/^\s*(i did|and)\s+/i, "").trim();
    const parsed = parseLightLine(stripped);
    if (parsed) exercises.push(parsed);
  }

  if (exercises.length === 0) return null;
  return { name: exercises[0]?.name ?? null, exercises };
}

export function parseWeightTokenSafe(raw: string) {
  return parseWeightToken(raw);
}
