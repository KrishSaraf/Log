/**
 * Collapses the sample-level stream from `parse-export.ts` (or the webhook
 * normalizer) into rows that fit `health_metrics`.
 *
 * `health_metrics` is unique on `(date, metric, source)`, which forces two
 * decisions this module makes explicit:
 *
 * 1. Per-source rows are kept rather than merged. An iPhone and an Apple Watch
 *    both record steps for the same day; summing them double counts by roughly
 *    2x. Storing both and letting the read layer prefer a source (see
 *    `preferredSourceOrder`) is lossless and reversible.
 * 2. Same-day samples from one source must be reduced with the right operator.
 *    Steps sum, weight takes the last reading, heart rate needs min/avg/max.
 */

import { ASLEEP_STAGES, SLEEP_METRICS, type HealthMetricRow, type NormalizedRecord, type NormalizedWorkout, type SleepStage } from "./types";

export interface AggregateOptions {
  /**
   * Merge overlapping sleep segments from the same source before summing.
   * Apple states stage samples do not overlap each other, but re-imported or
   * third-party data sometimes does. Defaults to true.
   */
  dedupeSleepOverlaps?: boolean;
  /** Value for `health_metrics.recorded_at`. Defaults to now. */
  recordedAt?: Date;
  /** Round emitted values to this many decimals. Defaults to 3. */
  precision?: number;
}

interface Accumulator {
  date: string;
  metric: string;
  source: string;
  unit: string;
  aggregation: "sum" | "avg" | "latest" | "max" | "min";
  emitStats: boolean;
  sum: number;
  count: number;
  min: number;
  max: number;
  latestMs: number;
  latestValue: number;
}

interface Interval {
  start: number;
  end: number;
}

type SleepBuckets = Record<SleepStage, Interval[] | number>;

function emptySleepBuckets(dedupe: boolean): SleepBuckets {
  const init = () => (dedupe ? ([] as Interval[]) : 0);
  return {
    inBed: init(),
    awake: init(),
    core: init(),
    deep: init(),
    rem: init(),
    unspecified: init(),
  };
}

/** Total minutes covered by a set of intervals, counting overlaps once. */
function mergedMinutes(intervals: Interval[]): number {
  if (intervals.length === 0) return 0;
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  let total = 0;
  let { start, end } = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    if (next.start <= end) {
      if (next.end > end) end = next.end;
    } else {
      total += end - start;
      start = next.start;
      end = next.end;
    }
  }
  total += end - start;
  return total / 60_000;
}

/**
 * Accumulates normalized records and emits `health_metrics` rows.
 *
 * Memory is proportional to `days x metrics x sources`, not to the number of
 * samples, so a decade of data costs tens of megabytes while the input file can
 * be gigabytes.
 */
export class DailyMetricAggregator {
  private readonly metrics = new Map<string, Accumulator>();
  private readonly sleep = new Map<string, SleepBuckets>();
  private readonly workouts: NormalizedWorkout[] = [];
  private readonly dedupeSleep: boolean;
  private readonly recordedAt: Date;
  private readonly precision: number;

  constructor(options: AggregateOptions = {}) {
    this.dedupeSleep = options.dedupeSleepOverlaps ?? true;
    this.recordedAt = options.recordedAt ?? new Date();
    this.precision = options.precision ?? 3;
  }

  add(record: NormalizedRecord): void {
    if (record.kind === "workout") {
      this.workouts.push(record);
      return;
    }

    if (record.kind === "sleep") {
      const key = `${record.date}\u0000${record.source}`;
      let buckets = this.sleep.get(key);
      if (!buckets) {
        buckets = emptySleepBuckets(this.dedupeSleep);
        this.sleep.set(key, buckets);
      }
      if (this.dedupeSleep) {
        (buckets[record.stage] as Interval[]).push({ start: record.startMs, end: record.endMs });
      } else {
        (buckets[record.stage] as number) +=
          Math.max(0, record.endMs - record.startMs) / 60_000;
      }
      return;
    }

    const key = `${record.date}\u0000${record.metric}\u0000${record.source}`;
    const existing = this.metrics.get(key);
    if (!existing) {
      this.metrics.set(key, {
        date: record.date,
        metric: record.metric,
        source: record.source,
        unit: record.unit,
        aggregation: record.aggregation,
        emitStats: record.emitStats,
        sum: record.value,
        count: 1,
        min: record.value,
        max: record.value,
        latestMs: record.endMs,
        latestValue: record.value,
      });
      return;
    }

    existing.sum += record.value;
    existing.count++;
    if (record.value < existing.min) existing.min = record.value;
    if (record.value > existing.max) existing.max = record.value;
    if (record.endMs >= existing.latestMs) {
      existing.latestMs = record.endMs;
      existing.latestValue = record.value;
    }
  }

  private round(value: number): number {
    const scale = 10 ** this.precision;
    return Math.round(value * scale) / scale;
  }

  private reduce(accumulator: Accumulator): number {
    switch (accumulator.aggregation) {
      case "sum":
        return accumulator.sum;
      case "avg":
        return accumulator.sum / accumulator.count;
      case "min":
        return accumulator.min;
      case "max":
        return accumulator.max;
      case "latest":
        return accumulator.latestValue;
    }
  }

  /** All accumulated `health_metrics` rows, sorted by date then metric. */
  toMetricRows(): HealthMetricRow[] {
    const rows: HealthMetricRow[] = [];

    for (const accumulator of this.metrics.values()) {
      const base = {
        date: accumulator.date,
        unit: accumulator.unit,
        source: accumulator.source,
        recordedAt: this.recordedAt,
      };

      if (accumulator.emitStats) {
        // A single "heart rate" number for a day is meaningless, so the bare
        // metric name is never written for these; only the three statistics.
        rows.push(
          { ...base, metric: `${accumulator.metric}_min`, value: this.round(accumulator.min) },
          {
            ...base,
            metric: `${accumulator.metric}_avg`,
            value: this.round(accumulator.sum / accumulator.count),
          },
          { ...base, metric: `${accumulator.metric}_max`, value: this.round(accumulator.max) },
        );
        continue;
      }

      rows.push({ ...base, metric: accumulator.metric, value: this.round(this.reduce(accumulator)) });
    }

    for (const [key, buckets] of this.sleep) {
      const separator = key.indexOf("\u0000");
      const date = key.slice(0, separator);
      const source = key.slice(separator + 1);

      const minutesOf = (stage: SleepStage): number => {
        const bucket = buckets[stage];
        return typeof bucket === "number" ? bucket : mergedMinutes(bucket);
      };

      // Asleep is the union of the sleep stages, not the sum of everything.
      // `inBed` deliberately overlaps the stages and is reported separately.
      const asleepIntervals: Interval[] = [];
      let asleepMinutes = 0;
      for (const stage of ASLEEP_STAGES) {
        const bucket = buckets[stage];
        if (typeof bucket === "number") asleepMinutes += bucket;
        else asleepIntervals.push(...bucket);
      }
      if (asleepIntervals.length > 0) asleepMinutes = mergedMinutes(asleepIntervals);

      const values: Array<[string, number, string]> = [
        [SLEEP_METRICS.asleep, asleepMinutes, "min"],
        [SLEEP_METRICS.hours, asleepMinutes / 60, "hr"],
        [SLEEP_METRICS.inBed, minutesOf("inBed"), "min"],
        [SLEEP_METRICS.core, minutesOf("core"), "min"],
        [SLEEP_METRICS.deep, minutesOf("deep"), "min"],
        [SLEEP_METRICS.rem, minutesOf("rem"), "min"],
        [SLEEP_METRICS.awake, minutesOf("awake"), "min"],
      ];

      for (const [metric, value, unit] of values) {
        if (value <= 0) continue;
        rows.push({
          date,
          metric,
          value: this.round(value),
          unit,
          source,
          recordedAt: this.recordedAt,
        });
      }
    }

    rows.sort((a, b) => a.date.localeCompare(b.date) || a.metric.localeCompare(b.metric));
    return rows;
  }

  toWorkouts(): NormalizedWorkout[] {
    return [...this.workouts].sort((a, b) => a.startMs - b.startMs);
  }
}

/** Drain an async record stream into `health_metrics` rows and workouts. */
export async function aggregateDaily(
  records: AsyncIterable<NormalizedRecord>,
  options: AggregateOptions = {},
): Promise<{ metrics: HealthMetricRow[]; workouts: NormalizedWorkout[] }> {
  const aggregator = new DailyMetricAggregator(options);
  for await (const record of records) aggregator.add(record);
  return { metrics: aggregator.toMetricRows(), workouts: aggregator.toWorkouts() };
}

/**
 * Pick one row per `(date, metric)` when several sources recorded the same
 * thing. Sources are matched by case-insensitive substring so "Krish's Apple
 * Watch" is selected by the entry "apple watch".
 */
export function preferredSourceOrder(
  rows: readonly HealthMetricRow[],
  order: readonly string[],
): HealthMetricRow[] {
  const rank = (source: string): number => {
    const lower = source.toLowerCase();
    const index = order.findIndex((candidate) => lower.includes(candidate.toLowerCase()));
    return index === -1 ? order.length : index;
  };

  const best = new Map<string, HealthMetricRow>();
  for (const row of rows) {
    const key = `${row.date}\u0000${row.metric}`;
    const incumbent = best.get(key);
    if (!incumbent || rank(row.source) < rank(incumbent.source)) best.set(key, row);
  }
  return [...best.values()].sort(
    (a, b) => a.date.localeCompare(b.date) || a.metric.localeCompare(b.metric),
  );
}
