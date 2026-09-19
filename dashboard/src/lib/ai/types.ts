/**
 * Normalized result types for the photo -> workout extraction layer.
 *
 * Everything in here describes a *draft*: something a human is expected to
 * review and correct before it is written to `hub.workouts`. The shape is
 * therefore deliberately lossy-in-nothing: alongside each normalized value we
 * keep the raw text it came from, where it came from, how confident we are,
 * and a list of issues the review UI should surface.
 *
 * Rule of thumb enforced throughout: a value is `null` when we could not read
 * it. We never substitute a plausible-looking number for one we did not see.
 */

export type WeightUnit = "kg" | "lb";

/** Matches the `source` enum on `hub.workouts`. */
export type WorkoutSource = "manual" | "photo" | "import" | "apple_health";

/** Where a normalized value came from. */
export type ProvenanceSource =
  /** The vision model read it directly off the image. */
  | "vision"
  /** The deterministic notation parser derived it from transcribed text. */
  | "notation"
  /** We derived it ourselves (unit defaulting, set expansion, date fallback). */
  | "inferred"
  /** A human typed or corrected it in the review UI. */
  | "user";

/**
 * Coarse confidence bucket. Derived from the numeric score so UI code does not
 * have to hard-code thresholds; see `confidenceLevel()` in `confidence.ts`.
 */
export type ConfidenceLevel = "high" | "medium" | "low" | "unreadable";

export interface Provenance {
  source: ProvenanceSource;
  /** 0..1. */
  confidence: number;
  level: ConfidenceLevel;
  /** The exact substring of the transcription this value was derived from. */
  rawText: string | null;
  /** Human-readable trail, e.g. `["3x8 read as 3 sets of 8", "unit defaulted to kg"]`. */
  notes: string[];
}

export type IssueSeverity =
  /** Worth showing, safe to save as-is. */
  | "info"
  /** The user should look at this before saving. */
  | "warning"
  /** The UI must not allow a save until the user resolves it. */
  | "blocker";

export type IssueCode =
  /** Text was visible but not legible enough to transcribe. */
  | "unreadable_text"
  /** A set clearly exists on the page but its numbers could not be read. */
  | "unreadable_set"
  /** No row in the exercise library scored above the match threshold. */
  | "no_exercise_match"
  /** A match was found but it is weak enough that alternatives are offered. */
  | "low_confidence_match"
  /** Several library rows scored within a hair of each other. */
  | "ambiguous_exercise_match"
  /** kg vs lb could not be determined from the page. */
  | "ambiguous_unit"
  /** `@8`-style token that could be a load or an RPE. */
  | "ambiguous_rpe_or_weight"
  /** `60x8` style token that could be sets x reps or weight x reps. */
  | "ambiguous_sets_or_weight"
  /** A rep range (`3x8-10`) was written; the actual reps performed are unknown. */
  | "rep_range"
  /** A resistance exercise with no load written down. */
  | "missing_load"
  /** A set with no rep count. */
  | "missing_reps"
  /** Value parsed fine but is outside a sane range for a human. */
  | "implausible_value"
  /** Set count came from an explicit multiplier, not from N written-out lines. */
  | "set_count_inferred"
  /** No date anywhere on the page. */
  | "date_missing"
  /** A date was written but the day/month order is ambiguous. */
  | "date_ambiguous"
  /** Part of the raw notation could not be interpreted at all. */
  | "notation_unparsed"
  /** The model and the deterministic parser disagreed about the same text. */
  | "model_disagreement"
  /** The image does not look like a workout at all. */
  | "not_a_workout"
  /** Page mentions a superset / circuit whose grouping may need checking. */
  | "superset_detected";

export interface ExtractionIssue {
  code: IssueCode;
  severity: IssueSeverity;
  message: string;
  /** The offending source text, when there is one. */
  rawText?: string;
  /** Dotted path into the draft, e.g. `exercises.2.sets.0.weightKg`. */
  path?: string;
}

/** How a transcribed label was resolved against the exercise library. */
export type MatchStrategy =
  /** Normalized label equals the library name exactly. */
  | "exact"
  /** Hit a hand-curated shorthand alias (`ohp`, `rdl`, `bench`). */
  | "alias"
  /** Equal after abbreviation expansion and normalization. */
  | "normalized"
  /** Every meaningful query token appears in the library name. */
  | "token-subset"
  /** Trigram + token similarity above threshold. */
  | "fuzzy";

export interface ExerciseMatch {
  /** FK for `hub.workout_exercises.exercise_id`. */
  exerciseId: string;
  name: string;
  bodyPart: string;
  equipment: string;
  target: string;
  /** 0..1 similarity. */
  score: number;
  strategy: MatchStrategy;
  /** The normalized/expanded string that actually produced the match. */
  matchedOn: string;
}

export interface DraftSet {
  /** 0-based, maps to `hub.workout_sets.set_index`. */
  setIndex: number;
  reps: number | null;
  /**
   * Set when the page wrote a range (`8-10`) instead of a number. `reps` stays
   * null in that case: we do not know what was actually performed.
   */
  repsMin: number | null;
  repsMax: number | null;
  /** Always metric. `null` for bodyweight or unreadable load. */
  weightKg: number | null;
  /** What the page literally said, before conversion. */
  originalWeight: { value: number; unit: WeightUnit } | null;
  /** True when the page said BW / bodyweight. `weightKg` then holds any added load. */
  isBodyweight: boolean;
  durationSeconds: number | null;
  distanceM: number | null;
  rpe: number | null;
  isWarmup: boolean;
  /** `AMRAP`, `to failure`, `max`. Reps may legitimately be null. */
  toFailure: boolean;
  /** Maps to `hub.workout_sets.completed`; false for a planned-but-unticked set. */
  completed: boolean;
  /** The row exists on the page but its numbers could not be read. */
  unreadable: boolean;
  rawText: string | null;
  provenance: Provenance;
  issues: ExtractionIssue[];
}

export interface DraftExercise {
  /** Maps to `hub.workout_exercises.order_index`. */
  orderIndex: number;
  /** Faithful transcription of what is on the page. Never cleaned up. */
  rawLabel: string;
  /** Lowercased, punctuation-stripped, abbreviations expanded. */
  normalizedLabel: string;
  /** Best library match, or null when nothing cleared the threshold. */
  match: ExerciseMatch | null;
  /** Ranked alternatives (including `match`) for the UI's correction dropdown. */
  candidates: ExerciseMatch[];
  /**
   * Value for `hub.workout_exercises.custom_name`. Populated with `rawLabel`
   * whenever `match` is null, so a slot is never nameless.
   */
  customName: string | null;
  notes: string | null;
  restSeconds: number | null;
  /** Exercises sharing a non-null group are a superset/circuit (`"A"`, `"B"`). */
  supersetGroup: string | null;
  sets: DraftSet[];
  provenance: Provenance;
  issues: ExtractionIssue[];
}

export interface ExtractionModelInfo {
  provider: "anthropic" | "openai" | "mock";
  modelId: string;
  inputTokens: number | null;
  outputTokens: number | null;
  /** Wall-clock duration of the model call, ms. */
  latencyMs: number | null;
}

export interface WorkoutDraft {
  /** `YYYY-MM-DD`, or null when the page had no readable date. */
  date: string | null;
  /** Whatever the page actually said, e.g. `"Tue 12/3"`. */
  dateRaw: string | null;
  name: string | null;
  notes: string | null;
  durationMinutes: number | null;
  source: WorkoutSource;
  /** Unit the page appeared to be written in; loads are always stored as kg. */
  detectedWeightUnit: WeightUnit | "unknown";
  exercises: DraftExercise[];
  /** Full line-by-line transcription the model produced. */
  transcript: string | null;
  /** Rolled up from the exercises; 0..1. */
  confidence: number;
  level: ConfidenceLevel;
  /** Draft-level issues (missing date, not-a-workout, etc.). */
  issues: ExtractionIssue[];
  /** True when any issue anywhere has severity `blocker`. */
  requiresReview: boolean;
  model: ExtractionModelInfo;
  provenance: Provenance;
}

/**
 * Row shapes for `hub.workouts` / `hub.workout_exercises` / `hub.workout_sets`.
 * Declared structurally rather than imported from `@/db/schema` so this module
 * stays usable (and testable) without a database connection.
 */
export interface WorkoutInsertPlan {
  workout: {
    date: string;
    name: string | null;
    notes: string | null;
    durationMinutes: number | null;
    source: WorkoutSource;
  };
  exercises: Array<{
    exerciseId: string | null;
    customName: string | null;
    orderIndex: number;
    notes: string | null;
    sets: Array<{
      setIndex: number;
      reps: number | null;
      weightKg: string | null;
      durationSeconds: number | null;
      distanceM: string | null;
      rpe: string | null;
      isWarmup: boolean;
      completed: boolean;
    }>;
  }>;
}

/** Thrown for failures that leave us with no draft at all. */
export class AiExtractionError extends Error {
  readonly code:
    | "missing_api_key"
    | "unsupported_provider"
    | "invalid_image"
    | "model_error"
    | "invalid_model_output";
  readonly cause?: unknown;

  constructor(
    code: AiExtractionError["code"],
    message: string,
    cause?: unknown,
  ) {
    super(message);
    this.name = "AiExtractionError";
    this.code = code;
    this.cause = cause;
  }
}
