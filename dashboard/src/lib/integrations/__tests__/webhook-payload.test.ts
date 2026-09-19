import assert from "node:assert/strict";
import test from "node:test";

import { DailyMetricAggregator } from "../apple-health/aggregate";
import {
  isAuthorizedWebhook,
  normalizeHealthAutoExportPayload,
} from "../apple-health/webhook-payload";
import type { HealthMetricRow } from "../apple-health/types";
import { HAE_PAYLOAD_AGGREGATED, HAE_PAYLOAD_UNAGGREGATED } from "./fixtures";

function rowsFor(payload: unknown): HealthMetricRow[] {
  const { records } = normalizeHealthAutoExportPayload(payload as never);
  const aggregator = new DailyMetricAggregator({ recordedAt: new Date("2026-09-19T02:00:00Z") });
  for (const record of records) aggregator.add(record);
  return aggregator.toMetricRows();
}

function value(rows: HealthMetricRow[], metric: string, source?: string): number {
  const row = rows.find((r) => r.metric === metric && (source === undefined || r.source === source));
  assert.ok(row, `expected a row for ${metric}${source ? ` from ${source}` : ""}`);
  return row.value;
}

test("webhook metrics map onto the same metric names as the XML importer", () => {
  const rows = rowsFor(HAE_PAYLOAD_UNAGGREGATED);

  assert.equal(value(rows, "steps", "Krish's iPhone"), 2000);
  assert.equal(value(rows, "steps", "Krish's Apple Watch"), 1350);

  // kJ from the webhook becomes kcal.
  assert.ok(Math.abs(value(rows, "active_calories") - 239.006) < 0.01);

  // `weight_&_body_mass` in pounds becomes weight_kg.
  assert.ok(Math.abs(value(rows, "weight_kg") - 75.796) < 0.01);

  assert.equal(value(rows, "dietary_calories"), 1430);
});

test("the heart rate summary shape becomes min/avg/max rows", () => {
  const rows = rowsFor(HAE_PAYLOAD_UNAGGREGATED);
  assert.equal(value(rows, "heart_rate_min"), 58);
  assert.equal(value(rows, "heart_rate_avg"), 74);
  assert.equal(value(rows, "heart_rate_max"), 150);
});

test("unaggregated sleep segments reduce exactly like the XML path", () => {
  const rows = rowsFor(HAE_PAYLOAD_UNAGGREGATED);
  assert.equal(value(rows, "sleep_core_minutes"), 120);
  assert.equal(value(rows, "sleep_deep_minutes"), 60);
  assert.equal(value(rows, "sleep_rem_minutes"), 90);
  assert.equal(value(rows, "sleep_asleep_minutes"), 270);
  const sleepRow = rows.find((r) => r.metric === "sleep_asleep_minutes");
  assert.equal(sleepRow?.date, "2026-09-16");
});

test("aggregated sleep does not double count totalSleep on top of the stages", () => {
  const rows = rowsFor(HAE_PAYLOAD_AGGREGATED);
  assert.equal(value(rows, "sleep_asleep_minutes"), 270);
  assert.equal(value(rows, "sleep_hours"), 4.5);
  assert.equal(value(rows, "sleep_in_bed_minutes"), 450);
  assert.equal(value(rows, "sleep_core_minutes"), 120);
});

test("unknown metric names are surfaced, not silently dropped", () => {
  const result = normalizeHealthAutoExportPayload(HAE_PAYLOAD_UNAGGREGATED as never);
  assert.deepEqual(result.unmappedMetrics, ["some_metric_apple_added_last_week"]);
  assert.equal(result.skippedPoints, 0);
});

test("webhook workouts normalize to the same shape as XML workouts", () => {
  const { records } = normalizeHealthAutoExportPayload(HAE_PAYLOAD_UNAGGREGATED as never);
  const workouts = records.filter((r) => r.kind === "workout");
  assert.equal(workouts.length, 1);

  const run = workouts[0];
  assert.equal(run.kind, "workout");
  if (run.kind !== "workout") return;
  assert.equal(run.type, "running");
  assert.equal(run.date, "2026-09-16");
  assert.equal(run.durationMinutes, 32.5);
  assert.equal(run.totalEnergyKcal, 410.5);
  assert.equal(run.totalDistanceKm, 8.37);
  assert.equal(run.avgHeartRate, 152.4);
  // Health Auto Export supplies a UUID, so the id is stable across re-sends.
  assert.equal(run.externalId, "hae:550e8400-e29b-41d4-a716-446655440000");
});

test("resending the same payload is idempotent at the row level", () => {
  const first = rowsFor(HAE_PAYLOAD_UNAGGREGATED);
  const second = rowsFor(HAE_PAYLOAD_UNAGGREGATED);
  assert.deepEqual(first, second);

  const keys = first.map((r) => `${r.date}|${r.metric}|${r.source}`);
  assert.equal(new Set(keys).size, keys.length, "rows must be unique on (date, metric, source)");
});

test("points without a source fall back to a stable default", () => {
  const { records } = normalizeHealthAutoExportPayload(
    {
      data: {
        metrics: [
          { name: "step_count", units: "count", data: [{ qty: 10, date: "2026-09-16 08:00:00 +0800" }] },
        ],
      },
    },
    { defaultSource: "Apple Health" },
  );
  assert.equal(records.length, 1);
  assert.equal(records[0].kind === "sample" && records[0].source, "Apple Health");
});

test("malformed points are counted rather than crashing the import", () => {
  const result = normalizeHealthAutoExportPayload({
    data: {
      metrics: [
        {
          name: "step_count",
          units: "count",
          data: [{ qty: 10 }, { date: "2026-09-16 08:00:00 +0800" }, { qty: 5, date: "nonsense" }],
        },
      ],
      workouts: [{ name: "Running" }],
    },
  } as never);
  assert.equal(result.records.length, 0);
  assert.equal(result.skippedPoints, 4);
});

test("version 1 payloads with top-level arrays still parse", () => {
  const { records } = normalizeHealthAutoExportPayload({
    metrics: [
      { name: "step_count", units: "count", data: [{ qty: 42, date: "2026-09-16 08:00:00 +0800" }] },
    ],
  } as never);
  assert.equal(records.length, 1);
});

test("isAuthorizedWebhook rejects missing, short and wrong secrets", () => {
  assert.equal(isAuthorizedWebhook("secret", "secret"), true);
  assert.equal(isAuthorizedWebhook("secret", "secrex"), false);
  assert.equal(isAuthorizedWebhook("secre", "secret"), false);
  assert.equal(isAuthorizedWebhook(null, "secret"), false);
  assert.equal(isAuthorizedWebhook("secret", undefined), false);
  assert.equal(isAuthorizedWebhook("", ""), false);
});
