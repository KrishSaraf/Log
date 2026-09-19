/**
 * Streaming parser for the Apple Health `export.xml` file.
 *
 * `export.xml` is a flat event log that reaches several hundred megabytes for a
 * multi-year Apple Watch user, so this module never materialises the document.
 * It pulls bytes from an async source, keeps only the bytes of the tag it is
 * currently scanning plus the workout element currently open, and yields
 * normalized records as it goes. Peak memory is a few hundred kilobytes
 * regardless of file size.
 *
 * No XML dependency: the file is a strict, machine-generated subset of XML
 * (elements with attributes, no mixed content, one DOCTYPE with an internal
 * subset), which a ~200 line scanner handles more cheaply than a general
 * parser. The scanner is quote-aware because Apple's `device` attribute embeds
 * angle brackets.
 */

import {
  ASLEEP_STAGES,
  METRIC_DEFINITIONS,
  SLEEP_VALUE_TO_STAGE,
  convertToCanonical,
  durationToMinutes,
  workoutTypeSlug,
  type CanonicalUnit,
  type HealthSample,
  type NormalizedRecord,
  type NormalizedWorkout,
  type SleepSegment,
} from "./types";
import {
  minutesBetween,
  parseAppleDate,
  sleepDate,
  localDate,
  type DateBucketing,
} from "./dates";

/** Anything we can pull bytes or text out of. */
export type XmlSource =
  | AsyncIterable<Uint8Array | string>
  | ReadableStream<Uint8Array>
  | string;

export interface ParseExportOptions {
  /** How to decide the calendar day of a sample. Defaults to `device-offset`. */
  bucketing?: DateBucketing;
  /**
   * Restrict to these HealthKit type identifiers. Defaults to every identifier
   * in `METRIC_DEFINITIONS` plus sleep. Narrowing this makes a full re-import
   * meaningfully faster.
   */
  include?: Iterable<string>;
  /** Drop samples whose bucketed date is before this `YYYY-MM-DD`. */
  since?: string;
  /** Parse `<ActivitySummary>` elements into Apple's own daily rollups. */
  includeActivitySummaries?: boolean;
  /** Called roughly every `progressEveryRecords` records. */
  onProgress?: (stats: Readonly<ParseStats>) => void;
  progressEveryRecords?: number;
}

export interface ParseStats {
  bytesRead: number;
  elementsScanned: number;
  recordsEmitted: number;
  workoutsEmitted: number;
  sleepSegmentsEmitted: number;
  /** Type identifiers seen but not mapped, with occurrence counts. */
  unmappedTypes: Record<string, number>;
  /** Records dropped because a date failed to parse. */
  malformedDates: number;
}

const SLEEP_TYPE = "HKCategoryTypeIdentifierSleepAnalysis";
const MINDFUL_TYPE = "HKCategoryTypeIdentifierMindfulSession";

/** Source name used for Apple's own precomputed daily activity rollups. */
export const ACTIVITY_SUMMARY_SOURCE = "Apple Activity Summary";

// ---------------------------------------------------------------------------
// Byte source normalisation
// ---------------------------------------------------------------------------

async function* toChunks(source: XmlSource): AsyncGenerator<string> {
  if (typeof source === "string") {
    yield source;
    return;
  }

  const decoder = new TextDecoder("utf-8");

  if (Symbol.asyncIterator in source) {
    for await (const chunk of source as AsyncIterable<Uint8Array | string>) {
      yield typeof chunk === "string" ? chunk : decoder.decode(chunk, { stream: true });
    }
  } else {
    const reader = (source as ReadableStream<Uint8Array>).getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) yield decoder.decode(value, { stream: true });
      }
    } finally {
      reader.releaseLock();
    }
  }

  const tail = decoder.decode();
  if (tail) yield tail;
}

// ---------------------------------------------------------------------------
// Attribute parsing
// ---------------------------------------------------------------------------

const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

function decodeEntities(value: string): string {
  if (!value.includes("&")) return value;
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body[0] === "#") {
      const code =
        body[1] === "x" || body[1] === "X"
          ? Number.parseInt(body.slice(2), 16)
          : Number.parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return NAMED_ENTITIES[body] ?? whole;
  });
}

/**
 * Copy a string out of the chunk it was sliced from.
 *
 * V8 represents `bigString.slice(a, b)` as a view that keeps the whole parent
 * alive. Attribute values are slices of the current chunk, so retaining even
 * one of them past the chunk (an interned source name, a workout's metadata)
 * pins the entire chunk. Left unchecked this makes peak heap grow linearly
 * with file size — exactly the failure mode streaming is supposed to avoid.
 */
const ENCODER = new TextEncoder();
const DECODER = new TextDecoder();

function detach(value: string): string {
  return DECODER.decode(ENCODER.encode(value));
}

/**
 * Pool for the handful of distinct strings we keep for the whole parse
 * (source names, type identifiers). Bounded so a corrupt file cannot grow it.
 */
function createInterner(limit = 4096): (value: string) => string {
  const pool = new Map<string, string>();
  return (value: string): string => {
    const existing = pool.get(value);
    if (existing !== undefined) return existing;
    const detached = detach(value);
    // Key on the detached copy, never on the aliasing original.
    if (pool.size < limit) pool.set(detached, detached);
    return detached;
  };
}

const ATTRIBUTE = /([A-Za-z_:][\w.:-]*)\s*=\s*("([^"]*)"|'([^']*)')/g;

/**
 * Extract attributes from a tag body.
 *
 * `wanted` limits which attributes are materialised. That matters on the hot
 * path: every `<Record>` carries a long `device="<<HKDevice: 0x...>>"` string
 * we never read, and skipping it removes the single largest allocation per
 * record across tens of millions of records.
 */
function parseAttributes(body: string, wanted?: ReadonlySet<string>): Record<string, string> {
  const attributes: Record<string, string> = {};
  ATTRIBUTE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ATTRIBUTE.exec(body)) !== null) {
    if (wanted && !wanted.has(match[1])) continue;
    attributes[match[1]] = decodeEntities(match[3] ?? match[4] ?? "");
  }
  return attributes;
}

const RECORD_ATTRIBUTES: ReadonlySet<string> = new Set([
  "type",
  "sourceName",
  "unit",
  "value",
  "startDate",
  "endDate",
]);

const WORKOUT_ATTRIBUTES: ReadonlySet<string> = new Set([
  "workoutActivityType",
  "duration",
  "durationUnit",
  "totalDistance",
  "totalDistanceUnit",
  "totalEnergyBurned",
  "totalEnergyBurnedUnit",
  "sourceName",
  "startDate",
  "endDate",
]);

/**
 * Find the index of the `>` that closes the tag starting at `from`, ignoring
 * any `>` inside a quoted attribute value. Returns -1 when the tag is not yet
 * fully buffered.
 */
function findTagEnd(buffer: string, from: number): number {
  let quote = "";
  for (let i = from; i < buffer.length; i++) {
    const ch = buffer[i];
    if (quote) {
      if (ch === quote) quote = "";
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === ">") {
      return i;
    }
  }
  return -1;
}

// ---------------------------------------------------------------------------
// Record normalisation
// ---------------------------------------------------------------------------

function normalizeRecord(
  attributes: Record<string, string>,
  bucketing: DateBucketing,
  stats: ParseStats,
  intern: (value: string) => string,
): HealthSample | SleepSegment | null {
  const rawType = attributes.type;
  if (!rawType) return null;
  const type = intern(rawType);

  const start = parseAppleDate(attributes.startDate);
  const end = parseAppleDate(attributes.endDate) ?? start;
  if (!start || !end) {
    stats.malformedDates++;
    return null;
  }

  const source = intern(attributes.sourceName || "unknown");

  if (type === SLEEP_TYPE) {
    const stage = SLEEP_VALUE_TO_STAGE[attributes.value ?? ""];
    if (!stage) return null;
    return {
      kind: "sleep",
      stage,
      date: sleepDate(end, bucketing),
      startMs: start.epochMs,
      endMs: end.epochMs,
      source,
    };
  }

  const definition = METRIC_DEFINITIONS[type];
  if (!definition) {
    stats.unmappedTypes[type] = (stats.unmappedTypes[type] ?? 0) + 1;
    return null;
  }

  // Category samples such as mindful sessions carry their magnitude in the
  // start/end span rather than in `value`.
  const rawValue =
    type === MINDFUL_TYPE
      ? minutesBetween(start.epochMs, end.epochMs)
      : Number.parseFloat(attributes.value ?? "");
  if (!Number.isFinite(rawValue)) return null;

  const value =
    type === MINDFUL_TYPE ? rawValue : convertToCanonical(rawValue, attributes.unit, definition);

  return {
    kind: "sample",
    metric: definition.metric,
    value,
    unit: definition.unit,
    // Cumulative samples span an interval; attribute them to the day they
    // started, matching how the Health app draws its daily bars.
    date: localDate(start, bucketing),
    startMs: start.epochMs,
    endMs: end.epochMs,
    source,
    aggregation: definition.aggregation,
    emitStats: definition.emitStats ?? false,
  };
}

interface PendingWorkout {
  attributes: Record<string, string>;
  metadata: Record<string, string>;
  statistics: Record<string, { sum?: number; average?: number; minimum?: number; maximum?: number; unit?: string }>;
}

function numberOrUndefined(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function finalizeWorkout(
  pending: PendingWorkout,
  bucketing: DateBucketing,
  stats: ParseStats,
  intern: (value: string) => string,
): NormalizedWorkout | null {
  const { attributes } = pending;
  const start = parseAppleDate(attributes.startDate);
  const end = parseAppleDate(attributes.endDate) ?? start;
  if (!start || !end) {
    stats.malformedDates++;
    return null;
  }

  const activityType = attributes.workoutActivityType ?? "HKWorkoutActivityTypeOther";
  const type = workoutTypeSlug(activityType);

  const declaredDuration = numberOrUndefined(attributes.duration);
  const durationMinutes =
    declaredDuration !== undefined
      ? durationToMinutes(declaredDuration, attributes.durationUnit ?? "min")
      : minutesBetween(start.epochMs, end.epochMs);

  // Energy and distance live on the element in older exports and in
  // <WorkoutStatistics> in newer ones; prefer the element, fall back to stats.
  const energyStat = pending.statistics.HKQuantityTypeIdentifierActiveEnergyBurned;
  const rawEnergy = numberOrUndefined(attributes.totalEnergyBurned) ?? energyStat?.sum;
  const energyUnit = attributes.totalEnergyBurnedUnit ?? energyStat?.unit;

  const distanceStat =
    pending.statistics.HKQuantityTypeIdentifierDistanceWalkingRunning ??
    pending.statistics.HKQuantityTypeIdentifierDistanceCycling ??
    pending.statistics.HKQuantityTypeIdentifierDistanceSwimming;
  const rawDistance = numberOrUndefined(attributes.totalDistance) ?? distanceStat?.sum;
  const distanceUnit = attributes.totalDistanceUnit ?? distanceStat?.unit;

  const heartRate = pending.statistics.HKQuantityTypeIdentifierHeartRate;

  return {
    kind: "workout",
    // export.xml exposes no workout UUID, so identity is (type, start instant).
    // Apple will not produce two workouts of the same type starting in the same
    // second, which makes this safe as an upsert key.
    externalId: `apple:${type}:${new Date(start.epochMs).toISOString()}`,
    type,
    date: localDate(start, bucketing),
    startMs: start.epochMs,
    endMs: end.epochMs,
    durationMinutes,
    totalEnergyKcal:
      rawEnergy === undefined
        ? undefined
        : convertToCanonical(rawEnergy, energyUnit, {
            metric: "active_calories",
            unit: "kcal",
            aggregation: "sum",
          }),
    totalDistanceKm:
      rawDistance === undefined
        ? undefined
        : convertToCanonical(rawDistance, distanceUnit, {
            metric: "distance",
            unit: "km",
            aggregation: "sum",
          }),
    avgHeartRate: heartRate?.average,
    maxHeartRate: heartRate?.maximum,
    minHeartRate: heartRate?.minimum,
    source: intern(attributes.sourceName || "unknown"),
    metadata: Object.keys(pending.metadata).length > 0 ? pending.metadata : undefined,
  };
}

/** Apple's own end-of-day rollup; the most trustworthy source for rings. */
function normalizeActivitySummary(attributes: Record<string, string>): HealthSample[] {
  const date = attributes.dateComponents;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];

  const midnightMs = Date.parse(`${date}T00:00:00Z`);
  const fields: Array<[string, string | undefined, CanonicalUnit]> = [
    ["active_calories", attributes.activeEnergyBurned, "kcal"],
    ["exercise_minutes", attributes.appleExerciseTime, "min"],
    ["stand_hours", attributes.appleStandHours, "count"],
    ["move_minutes", attributes.appleMoveTime, "min"],
  ];

  const samples: HealthSample[] = [];
  for (const [metric, raw, unit] of fields) {
    const value = numberOrUndefined(raw);
    if (value === undefined) continue;
    samples.push({
      kind: "sample",
      metric,
      value,
      unit,
      date,
      startMs: midnightMs,
      endMs: midnightMs,
      source: ACTIVITY_SUMMARY_SOURCE,
      aggregation: "latest",
      emitStats: false,
    });
  }
  return samples;
}

// ---------------------------------------------------------------------------
// The streaming scanner
// ---------------------------------------------------------------------------

/**
 * Stream normalized records out of an Apple Health `export.xml`.
 *
 * ```ts
 * import { createReadStream } from "node:fs";
 *
 * const stream = createReadStream("apple_health_export/export.xml");
 * for await (const record of streamAppleHealthExport(stream)) {
 *   // record.kind is "sample" | "sleep" | "workout"
 * }
 * ```
 */
export async function* streamAppleHealthExport(
  source: XmlSource,
  options: ParseExportOptions = {},
): AsyncGenerator<NormalizedRecord, ParseStats> {
  const bucketing = options.bucketing ?? "device-offset";
  const include = options.include ? new Set(options.include) : null;
  const since = options.since;
  const progressEvery = options.progressEveryRecords ?? 250_000;

  const stats: ParseStats = {
    bytesRead: 0,
    elementsScanned: 0,
    recordsEmitted: 0,
    workoutsEmitted: 0,
    sleepSegmentsEmitted: 0,
    unmappedTypes: {},
    malformedDates: 0,
  };

  const intern = createInterner();
  let buffer = "";
  let pending: PendingWorkout | null = null;

  /** Emits a record if it passes the `since` filter, updating counters. */
  function* accept(record: NormalizedRecord): Generator<NormalizedRecord> {
    if (since && record.date < since) return;
    if (record.kind === "sleep") stats.sleepSegmentsEmitted++;
    else if (record.kind === "workout") stats.workoutsEmitted++;
    else stats.recordsEmitted++;
    yield record;
  }

  for await (const chunk of toChunks(source)) {
    buffer += chunk;
    stats.bytesRead += chunk.length;

    let cursor = 0;
    for (;;) {
      const open = buffer.indexOf("<", cursor);
      if (open === -1) {
        cursor = buffer.length;
        break;
      }

      // Skip constructs that are not elements. Each needs its own terminator
      // because `>` can legally appear inside them.
      if (buffer.startsWith("<!--", open)) {
        const close = buffer.indexOf("-->", open + 4);
        if (close === -1) break;
        cursor = close + 3;
        continue;
      }
      if (buffer.startsWith("<![CDATA[", open)) {
        const close = buffer.indexOf("]]>", open + 9);
        if (close === -1) break;
        cursor = close + 3;
        continue;
      }
      if (buffer.startsWith("<?", open)) {
        const close = buffer.indexOf("?>", open + 2);
        if (close === -1) break;
        cursor = close + 2;
        continue;
      }
      if (buffer.startsWith("<!DOCTYPE", open)) {
        // Apple ships an internal DTD subset, so the declaration ends at `]>`
        // rather than the first `>`.
        const bracket = buffer.indexOf("[", open);
        const plainEnd = buffer.indexOf(">", open);
        if (plainEnd === -1) break;
        if (bracket !== -1 && bracket < plainEnd) {
          const subsetEnd = buffer.indexOf("]>", bracket);
          if (subsetEnd === -1) break;
          cursor = subsetEnd + 2;
        } else {
          cursor = plainEnd + 1;
        }
        continue;
      }

      const end = findTagEnd(buffer, open + 1);
      if (end === -1) break; // tag straddles the chunk boundary

      const inner = buffer.slice(open + 1, end);
      cursor = end + 1;
      stats.elementsScanned++;

      if (inner[0] === "/") {
        if (pending && inner.slice(1).trim() === "Workout") {
          const workout = finalizeWorkout(pending, bucketing, stats, intern);
          pending = null;
          if (workout) yield* accept(workout);
        }
        continue;
      }

      const selfClosing = inner.endsWith("/");
      const body = selfClosing ? inner.slice(0, -1) : inner;
      const nameEnd = body.search(/[\s/]/);
      const name = nameEnd === -1 ? body : body.slice(0, nameEnd);

      switch (name) {
        case "Record": {
          // Cheap pre-filter: avoid the attribute regex for the (usually vast)
          // majority of records whose type we do not want.
          if (include && !includesType(body, include)) break;
          const record = normalizeRecord(
            parseAttributes(body, RECORD_ATTRIBUTES),
            bucketing,
            stats,
            intern,
          );
          if (record) yield* accept(record);
          break;
        }

        case "Workout": {
          const attributes = parseAttributes(body, WORKOUT_ATTRIBUTES);
          if (selfClosing) {
            const workout = finalizeWorkout(
              { attributes, metadata: {}, statistics: {} },
              bucketing,
              stats,
              intern,
            );
            if (workout) yield* accept(workout);
          } else {
            pending = { attributes, metadata: {}, statistics: {} };
          }
          break;
        }

        case "WorkoutStatistics": {
          if (!pending) break;
          const attributes = parseAttributes(body);
          const type = attributes.type;
          if (!type) break;
          pending.statistics[intern(type)] = {
            sum: numberOrUndefined(attributes.sum),
            average: numberOrUndefined(attributes.average),
            minimum: numberOrUndefined(attributes.minimum),
            maximum: numberOrUndefined(attributes.maximum),
            unit: attributes.unit,
          };
          break;
        }

        case "MetadataEntry": {
          if (!pending) break;
          const attributes = parseAttributes(body);
          // Workouts are retained until the caller drains them, so their
          // metadata must not alias the chunk it came from.
          if (attributes.key) {
            pending.metadata[intern(attributes.key)] = detach(attributes.value ?? "");
          }
          break;
        }

        case "ActivitySummary": {
          if (!options.includeActivitySummaries) break;
          for (const sample of normalizeActivitySummary(parseAttributes(body))) {
            yield* accept(sample);
          }
          break;
        }

        // Workout routes, GPS points, HRV beat lists and clinical records are
        // deliberately skipped without parsing their attributes.
        default:
          break;
      }

      if (options.onProgress && stats.elementsScanned % progressEvery === 0) {
        options.onProgress(stats);
      }
    }

    // Drop everything already consumed so the buffer never grows with the file.
    buffer = cursor > 0 ? buffer.slice(cursor) : buffer;
  }

  options.onProgress?.(stats);
  return stats;
}

/**
 * Substring test for `type="..."` used to skip unwanted records before running
 * the attribute regex. Matching on the quoted form avoids false positives from
 * `sourceName` values that happen to contain an identifier.
 */
function includesType(body: string, include: ReadonlySet<string>): boolean {
  const at = body.indexOf('type="');
  if (at === -1) return false;
  const close = body.indexOf('"', at + 6);
  if (close === -1) return false;
  return include.has(body.slice(at + 6, close));
}

/** Every identifier the parser knows how to normalize. */
export function allKnownTypes(): string[] {
  return [...Object.keys(METRIC_DEFINITIONS), SLEEP_TYPE];
}

/**
 * Convenience wrapper that buffers results. Only use it on a filtered subset;
 * an unfiltered multi-year export produces tens of millions of samples and will
 * exhaust memory. Prefer `streamAppleHealthExport` plus `aggregateDaily`.
 */
export async function collectAppleHealthExport(
  source: XmlSource,
  options: ParseExportOptions = {},
): Promise<{ records: NormalizedRecord[]; stats: ParseStats }> {
  const records: NormalizedRecord[] = [];
  const iterator = streamAppleHealthExport(source, options);
  let result = await iterator.next();
  while (!result.done) {
    records.push(result.value);
    result = await iterator.next();
  }
  return { records, stats: result.value };
}

export { ASLEEP_STAGES };
