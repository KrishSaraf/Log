import type { WeightUnit } from "./types";

export const LB_PER_KG = 2.2046226218;
export const KG_PER_LB = 0.45359237;
export const M_PER_MILE = 1609.344;
export const M_PER_YARD = 0.9144;

export function lbToKg(lb: number): number {
  return roundTo(lb * KG_PER_LB, 2);
}

export function kgToLb(kg: number): number {
  return roundTo(kg * LB_PER_KG, 2);
}

export function toKg(value: number, unit: WeightUnit): number {
  return unit === "kg" ? roundTo(value, 2) : lbToKg(value);
}

export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Plausibility guards. Anything outside these ranges is kept but flagged, on
 * the theory that a weird-but-real number is better than a silently dropped
 * one — as long as the UI is told to ask.
 */
export const PLAUSIBLE = {
  weightKg: { min: 0.5, max: 500 },
  reps: { min: 1, max: 200 },
  rpe: { min: 1, max: 10 },
  durationSeconds: { min: 1, max: 6 * 60 * 60 },
  distanceM: { min: 1, max: 200_000 },
  setsPerExercise: { min: 1, max: 30 },
} as const;

export function isPlausible(
  field: keyof typeof PLAUSIBLE,
  value: number,
): boolean {
  const range = PLAUSIBLE[field];
  return value >= range.min && value <= range.max;
}

/**
 * Heuristic unit sniffing for a page that never wrote `kg` or `lb`.
 *
 * Barbell loads written in pounds cluster on 135/185/225/315; metric lifters
 * write 60/70/100/140. We only use this to *suggest* a unit — the draft still
 * reports `detectedWeightUnit: "unknown"` so the UI can ask.
 */
export function sniffUnitFromLoads(loads: number[]): WeightUnit | null {
  const numbers = loads.filter((n) => Number.isFinite(n) && n > 0);
  if (numbers.length === 0) return null;

  const imperialTells = new Set([95, 115, 135, 155, 185, 205, 225, 275, 315]);
  const imperialHits = numbers.filter((n) => imperialTells.has(n)).length;
  if (imperialHits >= 2 || (imperialHits === 1 && numbers.length === 1)) {
    return "lb";
  }

  // A 2.5 kg increment is the giveaway for metric micro-loading.
  const metricHits = numbers.filter(
    (n) => n % 2.5 === 0 && n % 5 !== 0 && n < 200,
  ).length;
  if (metricHits >= 1) return "kg";

  return null;
}
