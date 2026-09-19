/**
 * Types and normalizer for the JSON body that Health Auto Export (iOS) POSTs
 * to a REST API automation, Export Version 2.
 *
 * Output is the same `NormalizedRecord` union the export.xml parser produces,
 * so the webhook route and the file importer share all downstream code.
 *
 * Verified against the vendor docs (help.healthyapps.dev, "Health Metrics -
 * JSON Export Format" and "Workouts - JSON Export Format", last updated
 * 2026-08-23). Metric names are snake_case renderings of the Apple Health
 * display names, so the mapping table below is the part most likely to need a
 * tweak once a real payload is seen; anything unrecognised is reported in
 * `NormalizeResult.unmappedMetrics` instead of being silently dropped.
 */

import {
  METRIC_DEFINITIONS,
  SLEEP_VALUE_TO_STAGE,
  convertToCanonical,
  workoutTypeSlug,
  type HealthSample,
  type NormalizedRecord,
  type NormalizedWorkout,
  type SleepSegment,
} from "./types";
import { localDate, parseAppleDate, sleepDate, type DateBucketing } from "./dates";

// ---------------------------------------------------------------------------
// Payload types
// ---------------------------------------------------------------------------

/** The common `{ qty, date, source }` sample. */
export interface HaeQuantityPoint {
  qty?: number;
  date?: string;
  source?: string;
  units?: string;
}

/** `heart_rate` and friends report a summary rather than a single quantity. */
export interface HaeStatsPoint {
  date?: string;
  source?: string;
  Min?: number;
  Avg?: number;
  Max?: number;
}

/** `sleep_analysis` with "Summarize Data" ON. */
export interface HaeAggregatedSleepPoint {
  date?: string;
  source?: string;
  totalSleep?: number;
  asleep?: number;
  core?: number;
  deep?: number;
  rem?: number;
  awake?: number;
  inBed?: number;
  sleepStart?: string;
  sleepEnd?: string;
  inBedStart?: string;
  inBedEnd?: string;
}

/** `sleep_analysis` with "Summarize Data" OFF. */
export interface HaeSleepSegmentPoint {
  startDate?: string;
  endDate?: string;
  qty?: number;
  value?: string;
  source?: string;
}

/** `blood_pressure`. */
export interface HaeBloodPressurePoint {
  date?: string;
  source?: string;
  systolic?: number;
  diastolic?: number;
}

export type HaeMetricPoint =
  | HaeQuantityPoint
  | HaeStatsPoint
  | HaeAggregatedSleepPoint
  | HaeSleepSegmentPoint
  | HaeBloodPressurePoint;

export interface HaeMetric {
  name: string;
  units?: string;
  data?: HaeMetricPoint[];
}

export interface HaeWorkoutQuantity {
  qty?: number;
  units?: string;
}

export interface HaeWorkout {
  id?: string;
  name?: string;
  start?: string;
  end?: string;
  /** Seconds. */
  duration?: number;
  activeEnergyBurned?: HaeWorkoutQuantity;
  totalEnergy?: HaeWorkoutQuantity;
  totalEnergyBurned?: HaeWorkoutQuantity;
  distance?: HaeWorkoutQuantity;
  totalDistance?: HaeWorkoutQuantity;
  heartRate?: { min?: number; avg?: number; max?: number };
  avgHeartRate?: HaeWorkoutQuantity | number;
  maxHeartRate?: HaeWorkoutQuantity | number;
  metadata?: Record<string, unknown>;
  /** Present when "Include Workout Metrics" is on; intentionally ignored. */
  heartRateData?: unknown[];
  route?: unknown[];
}

export interface HealthAutoExportPayload {
  data?: {
    metrics?: HaeMetric[];
    workouts?: HaeWorkout[];
  };
  /** Version 1 payloads put the arrays at the top level. */
  metrics?: HaeMetric[];
  workouts?: HaeWorkout[];
}

// ---------------------------------------------------------------------------
// Metric name mapping
// ---------------------------------------------------------------------------

/**
 * Health Auto Export metric name -> HealthKit type identifier.
 *
 * Several names have historical aliases; all known spellings are listed so an
 * app update does not silently break ingestion.
 */
export const HAE_METRIC_NAME_TO_HK_IDENTIFIER: Readonly<Record<string, string>> = {
  step_count: "HKQuantityTypeIdentifierStepCount",
  steps: "HKQuantityTypeIdentifierStepCount",

  active_energy: "HKQuantityTypeIdentifierActiveEnergyBurned",
  active_energy_burned: "HKQuantityTypeIdentifierActiveEnergyBurned",
  basal_energy_burned: "HKQuantityTypeIdentifierBasalEnergyBurned",
  resting_energy: "HKQuantityTypeIdentifierBasalEnergyBurned",

  apple_exercise_time: "HKQuantityTypeIdentifierAppleExerciseTime",
  exercise_time: "HKQuantityTypeIdentifierAppleExerciseTime",
  apple_stand_time: "HKQuantityTypeIdentifierAppleStandTime",
  apple_move_time: "HKQuantityTypeIdentifierAppleMoveTime",

  walking_running_distance: "HKQuantityTypeIdentifierDistanceWalkingRunning",
  cycling_distance: "HKQuantityTypeIdentifierDistanceCycling",
  swimming_distance: "HKQuantityTypeIdentifierDistanceSwimming",
  flights_climbed: "HKQuantityTypeIdentifierFlightsClimbed",

  heart_rate: "HKQuantityTypeIdentifierHeartRate",
  resting_heart_rate: "HKQuantityTypeIdentifierRestingHeartRate",
  walking_heart_rate_average: "HKQuantityTypeIdentifierWalkingHeartRateAverage",
  heart_rate_variability: "HKQuantityTypeIdentifierHeartRateVariabilitySDNN",
  vo2_max: "HKQuantityTypeIdentifierVO2Max",
  respiratory_rate: "HKQuantityTypeIdentifierRespiratoryRate",
  blood_oxygen_saturation: "HKQuantityTypeIdentifierOxygenSaturation",

  "weight_&_body_mass": "HKQuantityTypeIdentifierBodyMass",
  weight_body_mass: "HKQuantityTypeIdentifierBodyMass",
  body_mass: "HKQuantityTypeIdentifierBodyMass",
  weight: "HKQuantityTypeIdentifierBodyMass",
  lean_body_mass: "HKQuantityTypeIdentifierLeanBodyMass",
  body_fat_percentage: "HKQuantityTypeIdentifierBodyFatPercentage",
  body_mass_index: "HKQuantityTypeIdentifierBodyMassIndex",
  height: "HKQuantityTypeIdentifierHeight",

  dietary_energy: "HKQuantityTypeIdentifierDietaryEnergyConsumed",
  dietary_energy_consumed: "HKQuantityTypeIdentifierDietaryEnergyConsumed",
  calories_consumed: "HKQuantityTypeIdentifierDietaryEnergyConsumed",
  protein: "HKQuantityTypeIdentifierDietaryProtein",
  dietary_protein: "HKQuantityTypeIdentifierDietaryProtein",
  carbohydrates: "HKQuantityTypeIdentifierDietaryCarbohydrates",
  dietary_carbohydrates: "HKQuantityTypeIdentifierDietaryCarbohydrates",
  total_fat: "HKQuantityTypeIdentifierDietaryFatTotal",
  dietary_fat_total: "HKQuantityTypeIdentifierDietaryFatTotal",
  fiber: "HKQuantityTypeIdentifierDietaryFiber",
  dietary_sugar: "HKQuantityTypeIdentifierDietarySugar",
  sodium: "HKQuantityTypeIdentifierDietarySodium",
  dietary_caffeine: "HKQuantityTypeIdentifierDietaryCaffeine",
  dietary_water: "HKQuantityTypeIdentifierDietaryWater",

  mindful_minutes: "HKCategoryTypeIdentifierMindfulSession",
};

export const HAE_SLEEP_METRIC = "sleep_analysis";

// ---------------------------------------------------------------------------
// Normalizer
// ---------------------------------------------------------------------------

export interface NormalizeWebhookOptions {
  bucketing?: DateBucketing;
  /**
   * Fallback for points that carry no `source`. On iOS 27+ Health Auto Export
   * omits `source` on cumulative and heart rate data for performance reasons,
   * and `health_metrics.source` is part of the unique key, so a stable default
   * is required. Defaults to `"Apple Health"`.
   */
  defaultSource?: string;
}

export interface NormalizeResult {
  records: NormalizedRecord[];
  /** Metric names present in the payload that we have no mapping for. */
  unmappedMetrics: string[];
  /** Points skipped because a timestamp or value was missing or malformed. */
  skippedPoints: number;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (value && typeof value === "object" && "qty" in value) {
    return asNumber((value as HaeWorkoutQuantity).qty);
  }
  return undefined;
}

/** Convert a Health Auto Export payload into normalized records. */
export function normalizeHealthAutoExportPayload(
  payload: HealthAutoExportPayload,
  options: NormalizeWebhookOptions = {},
): NormalizeResult {
  const bucketing = options.bucketing ?? "device-offset";
  const defaultSource = options.defaultSource ?? "Apple Health";

  const records: NormalizedRecord[] = [];
  const unmappedMetrics = new Set<string>();
  let skippedPoints = 0;

  const metrics = payload.data?.metrics ?? payload.metrics ?? [];
  const workouts = payload.data?.workouts ?? payload.workouts ?? [];

  for (const metric of metrics) {
    const name = (metric?.name ?? "").toLowerCase();
    const points = metric?.data ?? [];
    if (!name || points.length === 0) continue;

    if (name === HAE_SLEEP_METRIC) {
      for (const raw of points) {
        const emitted = normalizeSleepPoint(raw, bucketing, defaultSource);
        if (emitted.length === 0) skippedPoints++;
        records.push(...emitted);
      }
      continue;
    }

    const identifier = HAE_METRIC_NAME_TO_HK_IDENTIFIER[name];
    const definition = identifier ? METRIC_DEFINITIONS[identifier] : undefined;
    if (!definition) {
      unmappedMetrics.add(metric.name);
      continue;
    }

    for (const raw of points) {
      const point = raw as HaeQuantityPoint & HaeStatsPoint;
      const timestamp = parseAppleDate(point.date);
      if (!timestamp) {
        skippedPoints++;
        continue;
      }

      const date = localDate(timestamp, bucketing);
      const source = point.source || defaultSource;
      const units = point.units ?? metric.units;

      const base = {
        kind: "sample" as const,
        metric: definition.metric,
        unit: definition.unit,
        date,
        startMs: timestamp.epochMs,
        endMs: timestamp.epochMs,
        source,
        aggregation: definition.aggregation,
        emitStats: false,
      };

      // Summary-shaped points (heart rate) already carry min/avg/max, so feed
      // the aggregator three pre-reduced samples rather than one.
      const hasStats =
        point.Min !== undefined || point.Avg !== undefined || point.Max !== undefined;
      if (hasStats && definition.emitStats) {
        const push = (suffix: string, value: number | undefined, aggregation: "min" | "avg" | "max") => {
          if (value === undefined) return;
          records.push({
            ...base,
            metric: `${definition.metric}_${suffix}`,
            value: convertToCanonical(value, units, definition),
            aggregation: aggregation === "avg" ? "avg" : aggregation,
          } satisfies HealthSample);
        };
        push("min", point.Min, "min");
        push("avg", point.Avg, "avg");
        push("max", point.Max, "max");
        continue;
      }

      const quantity = asNumber(point.qty);
      if (quantity === undefined) {
        skippedPoints++;
        continue;
      }
      records.push({ ...base, value: convertToCanonical(quantity, units, definition) });
    }
  }

  for (const workout of workouts) {
    const normalized = normalizeWorkout(workout, bucketing, defaultSource);
    if (normalized) records.push(normalized);
    else skippedPoints++;
  }

  return { records, unmappedMetrics: [...unmappedMetrics], skippedPoints };
}

function normalizeSleepPoint(
  raw: HaeMetricPoint,
  bucketing: DateBucketing,
  defaultSource: string,
): SleepSegment[] {
  const point = raw as HaeAggregatedSleepPoint & HaeSleepSegmentPoint;
  const source = point.source || defaultSource;

  // Unaggregated: one segment per stage with real start/end timestamps.
  if (point.startDate && point.endDate) {
    const start = parseAppleDate(point.startDate);
    const end = parseAppleDate(point.endDate);
    const stage = SLEEP_VALUE_TO_STAGE[point.value ?? ""];
    if (!start || !end || !stage) return [];
    return [
      { kind: "sleep", stage, date: sleepDate(end, bucketing), startMs: start.epochMs, endMs: end.epochMs, source },
    ];
  }

  // Aggregated: per-night totals in hours, keyed by a plain `YYYY-MM-DD`.
  const sleepEnd = parseAppleDate(point.sleepEnd);
  const date =
    sleepEnd !== null
      ? sleepDate(sleepEnd, bucketing)
      : /^\d{4}-\d{2}-\d{2}/.test(point.date ?? "")
        ? (point.date as string).slice(0, 10)
        : null;
  if (!date) return [];

  // Aggregated sleep reports durations, not intervals, so synthesise
  // back-to-back windows. They must not overlap: the aggregator merges
  // overlapping segments, which would collapse the stages into one another.
  const anchorMs = sleepEnd?.epochMs ?? Date.parse(`${date}T00:00:00Z`);
  let cursorMs = anchorMs;
  const segments: SleepSegment[] = [];
  const push = (hours: number | undefined, stage: SleepSegment["stage"]) => {
    if (hours === undefined || hours <= 0) return;
    const startMs = cursorMs;
    const endMs = startMs + hours * 3_600_000;
    cursorMs = endMs;
    segments.push({ kind: "sleep", stage, date, startMs, endMs, source });
  };

  push(point.core, "core");
  push(point.deep, "deep");
  push(point.rem, "rem");
  push(point.awake, "awake");
  push(point.inBed, "inBed");

  // `asleep`/`totalSleep` duplicate the stage breakdown. Only fall back to them
  // when no stages were reported, otherwise total sleep gets counted twice.
  const hasStages = segments.some((segment) => segment.stage !== "awake" && segment.stage !== "inBed");
  if (!hasStages) push(point.totalSleep ?? point.asleep, "unspecified");

  return segments;
}

function normalizeWorkout(
  workout: HaeWorkout,
  bucketing: DateBucketing,
  defaultSource: string,
): NormalizedWorkout | null {
  const start = parseAppleDate(workout.start);
  const end = parseAppleDate(workout.end) ?? start;
  if (!start || !end) return null;

  const name = workout.name ?? "Other";
  // Health Auto Export sends display names ("Traditional Strength Training")
  // rather than HealthKit identifiers, so slugify the display name directly.
  const type = workoutTypeSlug(`HKWorkoutActivityType${name.replace(/[^A-Za-z0-9]/g, "")}`);

  const durationSeconds = asNumber(workout.duration);
  const durationMinutes =
    durationSeconds !== undefined
      ? durationSeconds / 60
      : Math.max(0, (end.epochMs - start.epochMs) / 60_000);

  const energy = workout.activeEnergyBurned ?? workout.totalEnergy ?? workout.totalEnergyBurned;
  const distance = workout.distance ?? workout.totalDistance;

  const energyValue = asNumber(energy);
  const distanceValue = asNumber(distance);

  return {
    kind: "workout",
    externalId: workout.id
      ? `hae:${workout.id}`
      : `apple:${type}:${new Date(start.epochMs).toISOString()}`,
    type,
    date: localDate(start, bucketing),
    startMs: start.epochMs,
    endMs: end.epochMs,
    durationMinutes,
    totalEnergyKcal:
      energyValue === undefined
        ? undefined
        : convertToCanonical(energyValue, energy?.units, {
            metric: "active_calories",
            unit: "kcal",
            aggregation: "sum",
          }),
    totalDistanceKm:
      distanceValue === undefined
        ? undefined
        : convertToCanonical(distanceValue, distance?.units, {
            metric: "distance",
            unit: "km",
            aggregation: "sum",
          }),
    avgHeartRate: workout.heartRate?.avg ?? asNumber(workout.avgHeartRate),
    maxHeartRate: workout.heartRate?.max ?? asNumber(workout.maxHeartRate),
    minHeartRate: workout.heartRate?.min,
    source: defaultSource,
    metadata: workout.metadata
      ? Object.fromEntries(
          Object.entries(workout.metadata).map(([key, value]) => [key, String(value)]),
        )
      : undefined,
  };
}

/**
 * Constant-time comparison for the shared secret sent in the `api-key` header.
 *
 * The webhook is the only unauthenticated surface the dashboard exposes on the
 * LAN, so the route handler must call this before doing any parsing work.
 */
export function isAuthorizedWebhook(
  providedSecret: string | null | undefined,
  expectedSecret: string | undefined,
): boolean {
  if (!expectedSecret || !providedSecret) return false;
  if (providedSecret.length !== expectedSecret.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expectedSecret.length; i++) {
    mismatch |= providedSecret.charCodeAt(i) ^ expectedSecret.charCodeAt(i);
  }
  return mismatch === 0;
}
