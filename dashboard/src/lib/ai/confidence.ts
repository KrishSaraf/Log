import type {
  ConfidenceLevel,
  ExtractionIssue,
  Provenance,
  ProvenanceSource,
} from "./types";

/**
 * Single place where numeric scores become UI-facing buckets.
 *
 * `unreadable` is reserved for "we know something is there and we could not
 * read it", which is a different statement from "we are 15% sure it is 60kg".
 */
export const CONFIDENCE_THRESHOLDS = {
  high: 0.85,
  medium: 0.6,
  low: 0.3,
} as const;

export function confidenceLevel(score: number): ConfidenceLevel {
  if (!Number.isFinite(score) || score <= 0) return "unreadable";
  if (score >= CONFIDENCE_THRESHOLDS.high) return "high";
  if (score >= CONFIDENCE_THRESHOLDS.medium) return "medium";
  return "low";
}

export function provenance(
  source: ProvenanceSource,
  confidence: number,
  rawText: string | null = null,
  notes: string[] = [],
): Provenance {
  const clamped = clamp01(confidence);
  return {
    source,
    confidence: round2(clamped),
    level: confidenceLevel(clamped),
    rawText,
    notes,
  };
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Roll a group of child confidences up into a parent score.
 *
 * Deliberately pessimistic: the mean is pulled toward the worst child, because
 * a workout containing one unreadable set is not "mostly fine" from the point
 * of view of someone about to trust the numbers.
 */
export function rollUpConfidence(scores: number[]): number {
  if (scores.length === 0) return 0;
  const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  const worst = Math.min(...scores);
  return round2(clamp01(mean * 0.65 + worst * 0.35));
}

/** Penalty applied per issue severity when scoring a node. */
export function issuePenalty(issues: ExtractionIssue[]): number {
  let penalty = 0;
  for (const issue of issues) {
    if (issue.severity === "blocker") penalty += 0.35;
    else if (issue.severity === "warning") penalty += 0.12;
    else penalty += 0.02;
  }
  return Math.min(0.8, penalty);
}

export function hasBlocker(issues: ExtractionIssue[]): boolean {
  return issues.some((issue) => issue.severity === "blocker");
}
