/**
 * Normalized Apple Health types shared by the export.xml parser and the
 * Health Auto Export webhook normalizer.
 *
 * Both pipelines produce the same `HealthSample` / `NormalizedWorkout` shapes so
 * that downstream aggregation and persistence code only has to be written once.
 */

/** How a metric should be collapsed when many samples land on the same local day. */
export type Aggregation = "sum" | "avg" | "latest" | "max" | "min";

/** Canonical units we store in `health_metrics.unit`. */
export type CanonicalUnit =
  | "count"
  | "kcal"
  | "min"
  | "hr"
  | "km"
  | "kg"
  | "cm"
  | "bpm"
  | "ms"
  | "%"
  | "g"
  | "mg"
  | "mL"
  | "L"
  | "mmHg"
  | "mg/dL"
  | "mL/min·kg"
  | "count/min";

export interface MetricDefinition {
  /** Value written to `health_metrics.metric`. */
  metric: string;
  /** Value written to `health_metrics.unit`. */
  unit: CanonicalUnit;
  /** How same-day samples from the same source combine. */
  aggregation: Aggregation;
  /**
   * When true, also emit `<metric>_min`, `<metric>_avg` and `<metric>_max` rows.
   * Used for instantaneous signals such as heart rate where a daily single
   * number is meaningless on its own.
   */
  emitStats?: boolean;
}

/**
 * HealthKit type identifier -> our `health_metrics.metric` name.
 *
 * Identifiers come from `Record/@type` in export.xml. Health Auto Export uses
 * its own snake_case names; `HAE_METRIC_NAME_TO_HK_IDENTIFIER` in
 * `webhook-payload.ts` maps those back onto these identifiers so there is a
 * single source of truth for metric naming.
 */
export const METRIC_DEFINITIONS: Readonly<Record<string, MetricDefinition>> = {
  // --- Activity ---
  HKQuantityTypeIdentifierStepCount: { metric: "steps", unit: "count", aggregation: "sum" },
  HKQuantityTypeIdentifierActiveEnergyBurned: {
    metric: "active_calories",
    unit: "kcal",
    aggregation: "sum",
  },
  HKQuantityTypeIdentifierBasalEnergyBurned: {
    metric: "resting_calories",
    unit: "kcal",
    aggregation: "sum",
  },
  HKQuantityTypeIdentifierAppleExerciseTime: {
    metric: "exercise_minutes",
    unit: "min",
    aggregation: "sum",
  },
  HKQuantityTypeIdentifierAppleStandTime: {
    metric: "stand_minutes",
    unit: "min",
    aggregation: "sum",
  },
  HKQuantityTypeIdentifierAppleMoveTime: {
    metric: "move_minutes",
    unit: "min",
    aggregation: "sum",
  },
  HKQuantityTypeIdentifierFlightsClimbed: {
    metric: "flights_climbed",
    unit: "count",
    aggregation: "sum",
  },
  HKQuantityTypeIdentifierDistanceWalkingRunning: {
    metric: "distance_walking_running_km",
    unit: "km",
    aggregation: "sum",
  },
  HKQuantityTypeIdentifierDistanceCycling: {
    metric: "distance_cycling_km",
    unit: "km",
    aggregation: "sum",
  },
  HKQuantityTypeIdentifierDistanceSwimming: {
    metric: "distance_swimming_km",
    unit: "km",
    aggregation: "sum",
  },

  // --- Heart ---
  HKQuantityTypeIdentifierHeartRate: {
    metric: "heart_rate",
    unit: "bpm",
    aggregation: "avg",
    emitStats: true,
  },
  HKQuantityTypeIdentifierRestingHeartRate: {
    metric: "resting_heart_rate",
    unit: "bpm",
    aggregation: "avg",
  },
  HKQuantityTypeIdentifierWalkingHeartRateAverage: {
    metric: "walking_heart_rate_avg",
    unit: "bpm",
    aggregation: "avg",
  },
  HKQuantityTypeIdentifierHeartRateVariabilitySDNN: {
    metric: "hrv_sdnn_ms",
    unit: "ms",
    aggregation: "avg",
  },
  HKQuantityTypeIdentifierVO2Max: {
    metric: "vo2_max",
    unit: "mL/min·kg",
    aggregation: "latest",
  },
  HKQuantityTypeIdentifierRespiratoryRate: {
    metric: "respiratory_rate",
    unit: "count/min",
    aggregation: "avg",
  },
  HKQuantityTypeIdentifierOxygenSaturation: {
    metric: "blood_oxygen_pct",
    unit: "%",
    aggregation: "avg",
  },

  // --- Body ---
  HKQuantityTypeIdentifierBodyMass: { metric: "weight_kg", unit: "kg", aggregation: "latest" },
  HKQuantityTypeIdentifierLeanBodyMass: {
    metric: "lean_body_mass_kg",
    unit: "kg",
    aggregation: "latest",
  },
  HKQuantityTypeIdentifierBodyFatPercentage: {
    metric: "body_fat_pct",
    unit: "%",
    aggregation: "latest",
  },
  HKQuantityTypeIdentifierBodyMassIndex: { metric: "bmi", unit: "count", aggregation: "latest" },
  HKQuantityTypeIdentifierHeight: { metric: "height_cm", unit: "cm", aggregation: "latest" },

  // --- Nutrition (written into HealthKit by MyFitnessPal / Cronometer / etc.) ---
  HKQuantityTypeIdentifierDietaryEnergyConsumed: {
    metric: "dietary_calories",
    unit: "kcal",
    aggregation: "sum",
  },
  HKQuantityTypeIdentifierDietaryProtein: {
    metric: "dietary_protein_g",
    unit: "g",
    aggregation: "sum",
  },
  HKQuantityTypeIdentifierDietaryCarbohydrates: {
    metric: "dietary_carbs_g",
    unit: "g",
    aggregation: "sum",
  },
  HKQuantityTypeIdentifierDietaryFatTotal: {
    metric: "dietary_fat_g",
    unit: "g",
    aggregation: "sum",
  },
  HKQuantityTypeIdentifierDietaryFiber: {
    metric: "dietary_fiber_g",
    unit: "g",
    aggregation: "sum",
  },
  HKQuantityTypeIdentifierDietarySugar: {
    metric: "dietary_sugar_g",
    unit: "g",
    aggregation: "sum",
  },
  HKQuantityTypeIdentifierDietarySodium: {
    metric: "dietary_sodium_mg",
    unit: "mg",
    aggregation: "sum",
  },
  HKQuantityTypeIdentifierDietaryCaffeine: {
    metric: "dietary_caffeine_mg",
    unit: "mg",
    aggregation: "sum",
  },
  HKQuantityTypeIdentifierDietaryWater: { metric: "water_ml", unit: "mL", aggregation: "sum" },

  // --- Category types ---
  HKCategoryTypeIdentifierMindfulSession: {
    metric: "mindful_minutes",
    unit: "min",
    aggregation: "sum",
  },
};

/**
 * Sleep is handled separately because HealthKit stores it as overlapping
 * category samples rather than a single quantity. These are the metric names
 * the sleep reducer emits; every one is minutes-per-night except `sleep_hours`.
 */
export const SLEEP_METRICS = {
  asleep: "sleep_asleep_minutes",
  inBed: "sleep_in_bed_minutes",
  core: "sleep_core_minutes",
  deep: "sleep_deep_minutes",
  rem: "sleep_rem_minutes",
  awake: "sleep_awake_minutes",
  hours: "sleep_hours",
} as const;

/** `HKCategoryValueSleepAnalysis*` string -> bucket used by the sleep reducer. */
export type SleepStage = "inBed" | "awake" | "core" | "deep" | "rem" | "unspecified";

export const SLEEP_VALUE_TO_STAGE: Readonly<Record<string, SleepStage>> = {
  HKCategoryValueSleepAnalysisInBed: "inBed",
  HKCategoryValueSleepAnalysisAwake: "awake",
  HKCategoryValueSleepAnalysisAsleepCore: "core",
  HKCategoryValueSleepAnalysisAsleepDeep: "deep",
  HKCategoryValueSleepAnalysisAsleepREM: "rem",
  HKCategoryValueSleepAnalysisAsleepUnspecified: "unspecified",
  // Pre-watchOS 9 exports only had a single undifferentiated "Asleep" value.
  HKCategoryValueSleepAnalysisAsleep: "unspecified",
  // Health Auto Export sends human-readable stage names instead of raw enum values.
  "In Bed": "inBed",
  Awake: "awake",
  Core: "core",
  Deep: "deep",
  REM: "rem",
  Asleep: "unspecified",
  Unspecified: "unspecified",
};

/** Stages that count towards time actually asleep. */
export const ASLEEP_STAGES: ReadonlySet<SleepStage> = new Set<SleepStage>([
  "core",
  "deep",
  "rem",
  "unspecified",
]);

/**
 * `HKWorkoutActivityType*` -> a short slug for `workouts.type`.
 *
 * Unlisted activity types fall back to a snake_case version of the identifier
 * suffix, so a new Apple workout type never causes data loss.
 */
export const WORKOUT_ACTIVITY_TYPES: Readonly<Record<string, string>> = {
  HKWorkoutActivityTypeRunning: "running",
  HKWorkoutActivityTypeWalking: "walking",
  HKWorkoutActivityTypeCycling: "cycling",
  HKWorkoutActivityTypeSwimming: "swimming",
  HKWorkoutActivityTypeHiking: "hiking",
  HKWorkoutActivityTypeTraditionalStrengthTraining: "strength_training",
  HKWorkoutActivityTypeFunctionalStrengthTraining: "functional_strength_training",
  HKWorkoutActivityTypeHighIntensityIntervalTraining: "hiit",
  HKWorkoutActivityTypeCoreTraining: "core_training",
  HKWorkoutActivityTypeElliptical: "elliptical",
  HKWorkoutActivityTypeRowing: "rowing",
  HKWorkoutActivityTypeStairClimbing: "stair_climbing",
  HKWorkoutActivityTypeYoga: "yoga",
  HKWorkoutActivityTypePilates: "pilates",
  HKWorkoutActivityTypeCooldown: "cooldown",
  HKWorkoutActivityTypeFlexibility: "flexibility",
  HKWorkoutActivityTypeMixedCardio: "mixed_cardio",
  HKWorkoutActivityTypeOther: "other",
};

/**
 * Source unit (as it appears in `Record/@unit` or Health Auto Export `units`)
 * -> canonical unit plus the factor to multiply the raw value by.
 *
 * HealthKit exports whatever unit the sample was recorded in, so a single
 * metric can arrive as `lb` from a smart scale and `kg` from a manual entry.
 */
interface UnitConversion {
  to: CanonicalUnit;
  factor: number;
}

const UNIT_CONVERSIONS: Readonly<Record<string, UnitConversion>> = {
  // mass
  kg: { to: "kg", factor: 1 },
  g: { to: "g", factor: 1 },
  mg: { to: "mg", factor: 1 },
  mcg: { to: "mg", factor: 0.001 },
  µg: { to: "mg", factor: 0.001 },
  lb: { to: "kg", factor: 0.45359237 },
  lbs: { to: "kg", factor: 0.45359237 },
  oz: { to: "kg", factor: 0.028349523125 },
  st: { to: "kg", factor: 6.35029318 },
  // length
  km: { to: "km", factor: 1 },
  m: { to: "km", factor: 0.001 },
  cm: { to: "cm", factor: 1 },
  mi: { to: "km", factor: 1.609344 },
  ft: { to: "cm", factor: 30.48 },
  in: { to: "cm", factor: 2.54 },
  yd: { to: "km", factor: 0.0009144 },
  // energy — HealthKit writes "Cal" for kilocalories (large calorie)
  kcal: { to: "kcal", factor: 1 },
  Cal: { to: "kcal", factor: 1 },
  cal: { to: "kcal", factor: 0.001 },
  kJ: { to: "kcal", factor: 0.239005736 },
  J: { to: "kcal", factor: 0.000239005736 },
  // time
  min: { to: "min", factor: 1 },
  sec: { to: "min", factor: 1 / 60 },
  s: { to: "min", factor: 1 / 60 },
  hr: { to: "min", factor: 60 },
  h: { to: "min", factor: 60 },
  // volume
  mL: { to: "mL", factor: 1 },
  ml: { to: "mL", factor: 1 },
  L: { to: "mL", factor: 1000 },
  l: { to: "mL", factor: 1000 },
  "fl_oz_us": { to: "mL", factor: 29.5735295625 },
  // rates and scalars
  count: { to: "count", factor: 1 },
  "count/min": { to: "bpm", factor: 1 },
  bpm: { to: "bpm", factor: 1 },
  ms: { to: "ms", factor: 1 },
  "%": { to: "%", factor: 1 },
  mmHg: { to: "mmHg", factor: 1 },
  "mg/dL": { to: "mg/dL", factor: 1 },
  "mL/min·kg": { to: "mL/min·kg", factor: 1 },
};

/**
 * Convert a raw HealthKit value into the canonical unit for `definition`.
 *
 * Returns the value unchanged when the source unit is unknown, so an unexpected
 * locale-specific unit degrades to "slightly wrong number" rather than a crash.
 */
export function convertToCanonical(
  value: number,
  rawUnit: string | undefined,
  definition: MetricDefinition,
): number {
  if (definition.unit === "%") {
    // HealthKit percent quantities are fractions (0.98 == 98%) but several
    // exporters have already multiplied by 100. Treat anything <= 1.5 as a
    // fraction; no real body-fat or SpO2 reading sits in that range.
    return value <= 1.5 ? value * 100 : value;
  }
  if (!rawUnit) return value;
  const conversion = UNIT_CONVERSIONS[rawUnit] ?? UNIT_CONVERSIONS[rawUnit.trim()];
  if (!conversion || conversion.to !== definition.unit) return value;
  return value * conversion.factor;
}

/** Convert a duration expressed in `unit` into minutes. */
export function durationToMinutes(value: number, unit: string | undefined): number {
  const conversion = unit ? UNIT_CONVERSIONS[unit] : undefined;
  if (conversion && conversion.to === "min") return value * conversion.factor;
  return value;
}

/**
 * A single normalized HealthKit sample, still at sample granularity.
 *
 * The parser streams these; `aggregateDaily` collapses them into
 * `health_metrics` rows.
 */
export interface HealthSample {
  kind: "sample";
  /** Our metric name, e.g. `steps`. */
  metric: string;
  /** Value already converted to `unit`. */
  value: number;
  unit: CanonicalUnit;
  /** Local calendar day (YYYY-MM-DD) the sample is attributed to. */
  date: string;
  /** Sample start as an epoch-millisecond timestamp. */
  startMs: number;
  /** Sample end as an epoch-millisecond timestamp. */
  endMs: number;
  /** `Record/@sourceName`, e.g. "Krish's Apple Watch". */
  source: string;
  aggregation: Aggregation;
  emitStats: boolean;
}

/** A sleep segment, kept separate because stages overlap and need reducing. */
export interface SleepSegment {
  kind: "sleep";
  stage: SleepStage;
  /** Night the segment is attributed to: the local day the sleep block ends on. */
  date: string;
  startMs: number;
  endMs: number;
  source: string;
}

export interface NormalizedWorkoutSample {
  metric: string;
  value: number;
  unit: CanonicalUnit;
}

/** A workout, mapped onto the `workouts` table. */
export interface NormalizedWorkout {
  kind: "workout";
  /**
   * Stable identifier derived from activity type + start time (export.xml has
   * no workout UUID) or taken from Health Auto Export's `id`. Use it as the
   * idempotency key when upserting.
   */
  externalId: string;
  type: string;
  /** Local calendar day the workout started on. */
  date: string;
  startMs: number;
  endMs: number;
  durationMinutes: number;
  totalEnergyKcal?: number;
  totalDistanceKm?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  minHeartRate?: number;
  source: string;
  /** Raw `MetadataEntry` key/value pairs, useful for indoor/outdoor and weather. */
  metadata?: Record<string, string>;
}

export type NormalizedRecord = HealthSample | SleepSegment | NormalizedWorkout;

/** A row ready to upsert into `health_metrics`. */
export interface HealthMetricRow {
  date: string;
  metric: string;
  value: number;
  unit: string;
  source: string;
  recordedAt: Date;
}

/** Turn an unmapped activity identifier into a usable slug. */
export function workoutTypeSlug(activityType: string): string {
  const known = WORKOUT_ACTIVITY_TYPES[activityType];
  if (known) return known;
  return activityType
    .replace(/^HKWorkoutActivityType/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase();
}
