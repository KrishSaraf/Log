import assert from "node:assert/strict";
import test from "node:test";

import { aggregateDaily, preferredSourceOrder } from "../apple-health/aggregate";
import { localDate, parseAppleDate, minutesBetween } from "../apple-health/dates";
import {
  ACTIVITY_SUMMARY_SOURCE,
  collectAppleHealthExport,
  streamAppleHealthExport,
} from "../apple-health/parse-export";
import type { HealthMetricRow, NormalizedRecord, NormalizedWorkout } from "../apple-health/types";
import { SAMPLE_EXPORT_XML } from "./fixtures";

/** Feed the fixture in small pieces so every tag straddles a chunk boundary. */
async function* chunked(text: string, size: number): AsyncGenerator<Uint8Array> {
  const bytes = new TextEncoder().encode(text);
  for (let i = 0; i < bytes.length; i += size) yield bytes.subarray(i, i + size);
}

function findMetric(rows: HealthMetricRow[], metric: string, source?: string): HealthMetricRow {
  const row = rows.find((r) => r.metric === metric && (source === undefined || r.source === source));
  assert.ok(row, `expected a row for ${metric}${source ? ` from ${source}` : ""}`);
  return row;
}

test("parseAppleDate uses the offset in the timestamp, not the host timezone", () => {
  const parsed = parseAppleDate("2026-09-16 23:30:00 +0800");
  assert.ok(parsed);
  assert.equal(parsed.offsetMinutes, 480);
  assert.equal(new Date(parsed.epochMs).toISOString(), "2026-09-16T15:30:00.000Z");

  // The classic bug: this instant is the 16th in Singapore and the 16th in UTC,
  // but 23:30 +0800 on the 16th is 15:30Z, so only offset-aware bucketing keeps
  // late-evening samples on the right day once the offset is larger.
  assert.equal(localDate(parsed, "device-offset"), "2026-09-16");
  assert.equal(localDate(parsed, { timeZone: "Asia/Singapore" }), "2026-09-16");
  assert.equal(localDate(parsed, { timeZone: "America/New_York" }), "2026-09-16");

  const evening = parseAppleDate("2026-09-17 07:00:00 +0800");
  assert.ok(evening);
  assert.equal(localDate(evening, "device-offset"), "2026-09-17");
  assert.equal(localDate(evening, "utc"), "2026-09-16");
});

test("parseAppleDate rejects garbage instead of producing Invalid Date", () => {
  assert.equal(parseAppleDate(""), null);
  assert.equal(parseAppleDate("not a date"), null);
  assert.equal(parseAppleDate(undefined), null);
});

test("minutesBetween never goes negative", () => {
  assert.equal(minutesBetween(1_000, 0), 0);
  assert.equal(minutesBetween(0, 600_000), 10);
});

test("the streaming parser survives arbitrary chunk boundaries", async () => {
  const reference = await collectAppleHealthExport(SAMPLE_EXPORT_XML, {
    includeActivitySummaries: true,
  });

  for (const size of [1, 3, 17, 512]) {
    const { records } = await collectAppleHealthExport(chunked(SAMPLE_EXPORT_XML, size), {
      includeActivitySummaries: true,
    });
    assert.deepEqual(
      records,
      reference.records,
      `chunk size ${size} produced a different record set`,
    );
  }
});

test("the parser reports unmapped types rather than failing", async () => {
  const { stats } = await collectAppleHealthExport(SAMPLE_EXPORT_XML);
  assert.equal(stats.unmappedTypes.HKQuantityTypeIdentifierEnvironmentalAudioExposure, 1);
  assert.equal(stats.malformedDates, 0);
  assert.equal(stats.workoutsEmitted, 2);
  assert.ok(stats.sleepSegmentsEmitted >= 6);
});

test("the include filter skips records before parsing their attributes", async () => {
  const { records, stats } = await collectAppleHealthExport(SAMPLE_EXPORT_XML, {
    include: ["HKQuantityTypeIdentifierStepCount"],
  });
  const samples = records.filter((r) => r.kind === "sample");
  assert.equal(samples.length, 3);
  assert.ok(samples.every((r) => r.kind === "sample" && r.metric === "steps"));
  // Workouts are element-level, not Record-level, so the filter leaves them.
  assert.equal(stats.workoutsEmitted, 2);
  assert.equal(Object.keys(stats.unmappedTypes).length, 0);
});

test("the since filter drops earlier days", async () => {
  const { records } = await collectAppleHealthExport(SAMPLE_EXPORT_XML, { since: "2026-09-17" });
  assert.ok(records.length > 0);
  assert.ok(records.every((r) => r.date >= "2026-09-17"));
});

test("units are converted and same-day samples reduced with the right operator", async () => {
  const { metrics } = await aggregateDaily(
    streamAppleHealthExport(SAMPLE_EXPORT_XML, { includeActivitySummaries: true }),
    { recordedAt: new Date("2026-09-19T02:00:00Z") },
  );

  // Cumulative metrics sum within a source and stay separate across sources.
  assert.equal(findMetric(metrics, "steps", "Krish's iPhone").value, 2000);
  assert.equal(findMetric(metrics, "steps", "Krish's Apple Watch").value, 1350);

  // "Cal" is kilocalories in HealthKit, so the value passes through unscaled.
  assert.equal(findMetric(metrics, "active_calories", "Krish's Apple Watch").value, 165.75);

  // Pounds become kilograms and "latest" wins over "first".
  const weight = findMetric(metrics, "weight_kg");
  assert.equal(weight.unit, "kg");
  assert.ok(Math.abs(weight.value - 75.796) < 0.01, `unexpected weight ${weight.value}`);

  // Percent quantities arrive from HealthKit as a fraction.
  assert.equal(findMetric(metrics, "blood_oxygen_pct").value, 97);

  // Mindful sessions carry their magnitude in the timestamps, not in `value`.
  assert.equal(findMetric(metrics, "mindful_minutes").value, 12);

  // Nutrition written into HealthKit by a food app sums for the day.
  assert.equal(findMetric(metrics, "dietary_calories").value, 1430);
  assert.equal(findMetric(metrics, "dietary_protein_g").value, 42.5);
});

test("heart rate becomes min/avg/max, never a single meaningless number", async () => {
  const { metrics } = await aggregateDaily(streamAppleHealthExport(SAMPLE_EXPORT_XML));
  assert.equal(findMetric(metrics, "heart_rate_min").value, 58);
  assert.equal(findMetric(metrics, "heart_rate_max").value, 150);
  assert.equal(findMetric(metrics, "heart_rate_avg").value, 94);
  assert.equal(
    metrics.find((r) => r.metric === "heart_rate"),
    undefined,
  );
});

test("sleep is attributed to the wake-up day, de-overlapped, and split by stage", async () => {
  const { metrics } = await aggregateDaily(streamAppleHealthExport(SAMPLE_EXPORT_XML));
  const sleepRows = metrics.filter((r) => r.metric.startsWith("sleep_"));
  assert.ok(sleepRows.every((r) => r.date === "2026-09-16"));

  // Core is present twice in the fixture; the overlap must count once.
  assert.equal(findMetric(metrics, "sleep_core_minutes").value, 120);
  assert.equal(findMetric(metrics, "sleep_deep_minutes").value, 60);
  assert.equal(findMetric(metrics, "sleep_rem_minutes").value, 90);
  assert.equal(findMetric(metrics, "sleep_awake_minutes").value, 10);

  // Asleep is the union of the stages, and excludes Awake and In Bed.
  assert.equal(findMetric(metrics, "sleep_asleep_minutes").value, 270);
  assert.equal(findMetric(metrics, "sleep_hours").value, 4.5);
  // In Bed overlaps the stages by design and is reported on its own.
  assert.equal(findMetric(metrics, "sleep_in_bed_minutes").value, 450);
});

test("workouts carry converted totals, statistics and metadata", async () => {
  const { workouts } = await aggregateDaily(streamAppleHealthExport(SAMPLE_EXPORT_XML));
  assert.equal(workouts.length, 2);

  const [run, lift] = workouts as NormalizedWorkout[];

  assert.equal(run.type, "running");
  assert.equal(run.date, "2026-09-16");
  assert.equal(run.durationMinutes, 32.5);
  assert.equal(run.totalEnergyKcal, 410.5);
  assert.ok(Math.abs((run.totalDistanceKm ?? 0) - 8.3686) < 0.001);
  assert.equal(run.avgHeartRate, 152.4);
  assert.equal(run.maxHeartRate, 178);
  assert.equal(run.minHeartRate, 98);
  assert.equal(run.metadata?.HKIndoorWorkout, "0");
  assert.equal(run.externalId, "apple:running:2026-09-16T10:00:00.000Z");

  // Self-closing <Workout/> elements are emitted too.
  assert.equal(lift.type, "strength_training");
  assert.equal(lift.source, "Hevy");
  assert.equal(lift.durationMinutes, 45);
  assert.equal(lift.metadata, undefined);
});

test("activity summaries are opt-in and land under their own source", async () => {
  const withoutSummaries = await aggregateDaily(streamAppleHealthExport(SAMPLE_EXPORT_XML));
  assert.equal(
    withoutSummaries.metrics.some((r) => r.source === ACTIVITY_SUMMARY_SOURCE),
    false,
  );

  const withSummaries = await aggregateDaily(
    streamAppleHealthExport(SAMPLE_EXPORT_XML, { includeActivitySummaries: true }),
  );
  assert.equal(
    findMetric(withSummaries.metrics, "active_calories", ACTIVITY_SUMMARY_SOURCE).value,
    620.25,
  );
  assert.equal(
    findMetric(withSummaries.metrics, "exercise_minutes", ACTIVITY_SUMMARY_SOURCE).value,
    41,
  );
  assert.equal(findMetric(withSummaries.metrics, "stand_hours", ACTIVITY_SUMMARY_SOURCE).value, 11);
});

test("preferredSourceOrder picks one row per metric without losing the rest", async () => {
  const { metrics } = await aggregateDaily(streamAppleHealthExport(SAMPLE_EXPORT_XML));
  const stepRows = metrics.filter((r) => r.metric === "steps");
  assert.equal(stepRows.length, 2);

  const preferred = preferredSourceOrder(metrics, ["Apple Watch", "iPhone"]);
  const steps = preferred.filter((r) => r.metric === "steps");
  assert.equal(steps.length, 1);
  assert.equal(steps[0].source, "Krish's Apple Watch");
});

test("bucketing strategy is configurable", async () => {
  const utc = await collectAppleHealthExport(SAMPLE_EXPORT_XML, {
    include: ["HKQuantityTypeIdentifierStepCount"],
    bucketing: "utc",
  });
  // 08:30 +0800 is 00:30Z on the same day; 23:30 +0800 is 15:30Z, also same
  // day. The strength workout at 07:00 +0800 on the 17th is the 16th in UTC.
  const dates = new Set((utc.records as NormalizedRecord[]).map((r) => r.date));
  assert.deepEqual([...dates], ["2026-09-16"]);
});
