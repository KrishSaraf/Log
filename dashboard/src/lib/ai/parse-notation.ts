/**
 * Deterministic parser for handwritten gym set notation.
 *
 * This module is pure: no I/O, no model, no clock (a `today` is passed in for
 * relative dates). It serves two roles:
 *
 *  1. Fallback when the vision model transcribes text but fails to structure
 *     it, or when the user pastes notes instead of a photo.
 *  2. Cross-check on whatever the model *did* structure. The model sees the
 *     same `rawText`; if the two disagree we downgrade confidence rather than
 *     silently trusting the model.
 *
 * Everything it cannot interpret is surfaced (`unparsed`, `issues`) instead of
 * being dropped.
 */

import type { ExtractionIssue, WeightUnit } from "./types";
import { M_PER_MILE, M_PER_YARD, isPlausible, roundTo, toKg } from "./units";

export interface ParseOptions {
  /** Unit to assume when the page never says. Krish is metric, so kg. */
  defaultUnit?: WeightUnit;
  /** `YYYY-MM-DD` used to resolve `today` / `yesterday` / bare weekdays. */
  today?: string;
}

export interface ParsedSet {
  reps: number | null;
  repsMin: number | null;
  repsMax: number | null;
  weightKg: number | null;
  originalWeight: { value: number; unit: WeightUnit } | null;
  isBodyweight: boolean;
  durationSeconds: number | null;
  distanceM: number | null;
  rpe: number | null;
  isWarmup: boolean;
  toFailure: boolean;
  /** The page shows a set here but the numbers were not legible. */
  unreadable: boolean;
  rawText: string;
  confidence: number;
  notes: string[];
  issues: ExtractionIssue[];
}

export interface ParsedLine {
  raw: string;
  /** Exercise label with set notation and list markers removed. */
  label: string;
  /** The notation region that produced `sets`, or null if there was none. */
  setText: string | null;
  sets: ParsedSet[];
  restSeconds: number | null;
  supersetGroup: string | null;
  notes: string | null;
  /** Unit literally written on the line, if any. */
  detectedUnit: WeightUnit | null;
  /** Fragments of `setText` we could not interpret. */
  unparsed: string[];
  issues: ExtractionIssue[];
  confidence: number;
}

export interface ParsedWorkoutText {
  date: string | null;
  dateRaw: string | null;
  dateAmbiguous: boolean;
  title: string | null;
  durationMinutes: number | null;
  lines: ParsedLine[];
  issues: ExtractionIssue[];
}

export interface ParsedDate {
  iso: string;
  raw: string;
  ambiguous: boolean;
  confidence: number;
}

/** `AxB` with A at or below this is read as a set count, not a load. */
const MAX_PLAUSIBLE_SET_COUNT = 12;

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

/** Unicode cleanup so every downstream regex can assume ASCII-ish input. */
export function normalizeNotation(input: string): string {
  return input
    .replace(/[\u00d7\u2715\u2716]/g, "x") // × ✕ ✖
    .replace(/[\u2010-\u2015\u2212]/g, "-") // dashes, minus
    .replace(/[\u2018\u2019\u02bc]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u00a0/g, " ")
    .replace(/\u00b7/g, ".")
    .replace(/[\t ]+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Label / notation split
// ---------------------------------------------------------------------------

const CONNECTOR_WORDS = new Set([
  "x",
  "set",
  "sets",
  "rep",
  "reps",
  "of",
  "for",
  "each",
  "ea",
  "side",
  "per",
  "rest",
  "rpe",
  "amrap",
  "bw",
  "bodyweight",
  "kg",
  "kgs",
  "kilo",
  "kilos",
  "lb",
  "lbs",
  "pound",
  "pounds",
  "min",
  "mins",
  "minute",
  "minutes",
  "sec",
  "secs",
  "second",
  "seconds",
  "km",
  "mi",
  "mile",
  "miles",
  "failure",
  "fail",
  "max",
  "to",
  "warmup",
  "warm-up",
  "wu",
  "w/u",
  "drop",
  "dropset",
  "+",
  "@",
]);

const VALUE_TOKEN_PATTERNS: RegExp[] = [
  /^@?\d+(?:\.\d+)?(?:kg|kgs|lb|lbs|#)?$/i, // 60  60kg  @60  225#
  /^\d+(?:\.\d+)?[x*]\d+(?:\.\d+)?(?:-\d+)?$/i, // 3x8  60x8  3x8-10
  /^\d+(?:\.\d+)?(?:kg|kgs|lb|lbs)[x*]\d+$/i, // 60kgx8
  /^[x*]\d+(?:\.\d+)?$/i, // x8
  /^\d+(?:\/\d+)+$/, // 5/5/5
  /^\d+(?:\.\d+)?(?:s|sec|secs|second|seconds|min|mins|minute|minutes|h|hr|hrs|hour|hours)$/i,
  /^\d+(?:\.\d+)?(?:m|km|mi|mile|miles|meter|meters|metre|metres|yd|yds|yard|yards)$/i,
  /^\d+:\d{2}$/, // 2:30
  /^\d+(?:\.\d+)?%$/,
  /^\d+-\d+$/, // 8-10
  /^bw(?:\+\d+(?:\.\d+)?(?:kg|lb|lbs)?)?$/i,
  /^\+\d+(?:\.\d+)?(?:kg|lb|lbs)?$/i,
  /^@?rpe\d*(?:\.\d)?$/i,
  /^@\d+(?:\.\d+)?$/,
  /^\?+$/, // ?? = illegible
];

function stripEdgePunctuation(token: string): string {
  return token.replace(/^[([{]+/, "").replace(/[)\]},;.]+$/, "");
}

function isValueToken(token: string): boolean {
  const t = stripEdgePunctuation(token);
  if (!t) return false;
  return VALUE_TOKEN_PATTERNS.some((re) => re.test(t));
}

function isConnectorToken(token: string): boolean {
  const t = stripEdgePunctuation(token).toLowerCase();
  return CONNECTOR_WORDS.has(t);
}

/**
 * Split `"bench 60x8, 70x6, 80x4"` into label `"bench"` and notation
 * `"60x8, 70x6, 80x4"` by walking tokens right-to-left for as long as they
 * look numeric or like notation filler.
 *
 * Walking backwards is what lets names that start with digits survive:
 * `"3/4 Sit-Up 3x12"` stops at `Sit-Up`, keeping `3/4` in the label.
 */
export function splitLabelAndNotation(line: string): {
  label: string;
  setText: string | null;
} {
  const normalized = normalizeNotation(line);

  // An explicit colon is the one delimiter names never contain.
  const colon = normalized.indexOf(":");
  if (colon > 0 && !/^\d+$/.test(normalized.slice(0, colon).trim())) {
    const left = normalized.slice(0, colon).trim();
    const right = normalized.slice(colon + 1).trim();
    if (left && right && /\d/.test(right)) {
      return { label: left, setText: right };
    }
  }

  const tokens = normalized.split(" ").filter(Boolean);
  let start = tokens.length;
  while (start > 0) {
    const token = tokens[start - 1];
    if (isValueToken(token) || isConnectorToken(token)) {
      start -= 1;
      continue;
    }
    break;
  }

  // Drop leading filler words so the notation region starts on a value.
  while (start < tokens.length && !isValueToken(tokens[start])) {
    start += 1;
  }
  // The region must end on a value, not a dangling "reps"/"of".
  let end = tokens.length;
  while (end > start && !isValueToken(tokens[end - 1])) {
    end -= 1;
  }

  if (start >= end) return { label: normalized, setText: null };

  const label = tokens.slice(0, start).join(" ").replace(/[-–:,\s]+$/, "");
  const setText = tokens.slice(start, end).join(" ");
  const trailing = tokens.slice(end).join(" ");

  return {
    label: trailing ? `${label} ${trailing}`.trim() : label,
    setText,
  };
}

// ---------------------------------------------------------------------------
// Segment-level extraction
// ---------------------------------------------------------------------------

interface SegmentContext {
  defaultUnit: WeightUnit;
  /** Set by the consistency pass when a sibling segment read `AxB` as load x reps. */
  forceWeightByReps?: boolean;
}

interface Extracted {
  rest: string;
  isWarmup: boolean;
  toFailure: boolean;
  isBodyweight: boolean;
  unreadable: boolean;
  weight: { value: number; unit: WeightUnit; explicitUnit: boolean } | null;
  durationSeconds: number | null;
  distanceM: number | null;
  rpe: number | null;
  notes: string[];
  issues: ExtractionIssue[];
}

function issue(
  code: ExtractionIssue["code"],
  severity: ExtractionIssue["severity"],
  message: string,
  rawText?: string,
): ExtractionIssue {
  return rawText ? { code, severity, message, rawText } : { code, severity, message };
}

/** Pulls every non-rep signal out of a segment, returning what is left over. */
function extractModifiers(segment: string, ctx: SegmentContext): Extracted {
  let rest = ` ${segment} `;
  const notes: string[] = [];
  const issues: ExtractionIssue[] = [];

  const take = (re: RegExp, onMatch: (m: RegExpMatchArray) => void): void => {
    const m = rest.match(re);
    if (!m) return;
    onMatch(m);
    rest = rest.replace(re, " ");
  };

  let unreadable = false;
  take(/\s(?:\?{2,}|\[?illegible\]?|\[?unclear\]?)\s/i, () => {
    unreadable = true;
  });

  let isWarmup = false;
  take(/\s(?:w\/u|wu|warm[\s-]?up|warmup)\s/i, () => {
    isWarmup = true;
  });

  let toFailure = false;
  take(/\s(?:amrap|to\s+failure|failure|max\s+reps|xf)\s/i, () => {
    toFailure = true;
  });

  // Tempo (3-1-3) must be consumed before rep ranges so `8-10` is not eaten.
  take(/\s\d-\d-\d(?:-\d)?\s/, (m) => {
    notes.push(`tempo ${m[0].trim()}`);
  });

  take(/\s(\d+(?:\.\d+)?)\s*%\s*(?:1rm)?\s/i, (m) => {
    notes.push(`${m[1]}% of 1RM (no absolute load written)`);
    issues.push(
      issue(
        "missing_load",
        "warning",
        `Load written as ${m[1]}% of 1RM; absolute weight unknown.`,
        segment.trim(),
      ),
    );
  });

  // RPE, most explicit form first.
  let rpe: number | null = null;
  take(/\s@?\s*rpe\s*[:=]?\s*(\d+(?:\.\d+)?)\s/i, (m) => {
    rpe = Number(m[1]);
  });
  if (rpe === null) {
    take(/\s(\d+(?:\.\d+)?)\s*rpe\s/i, (m) => {
      rpe = Number(m[1]);
    });
  }

  // Bodyweight, optionally with added load.
  let isBodyweight = false;
  let added: { value: number; unit: WeightUnit; explicitUnit: boolean } | null =
    null;
  take(
    /\s(?:bw|bodyweight|body\s*weight)\s*(?:\+\s*(\d+(?:\.\d+)?)\s*(kg|kgs|lb|lbs)?)?\s/i,
    (m) => {
      isBodyweight = true;
      if (m[1]) {
        const unit = m[2] ? parseUnit(m[2]) : ctx.defaultUnit;
        added = { value: Number(m[1]), unit, explicitUnit: Boolean(m[2]) };
      }
    },
  );

  // Duration before distance so `min` is consumed before a bare `m` can be.
  let durationSeconds: number | null = null;
  take(/\s(\d+):([0-5]\d)\s/, (m) => {
    durationSeconds = Number(m[1]) * 60 + Number(m[2]);
  });
  take(/\s(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\s/i, (m) => {
    durationSeconds = (durationSeconds ?? 0) + Math.round(Number(m[1]) * 3600);
  });
  take(/\s(\d+(?:\.\d+)?)\s*(?:min|mins|minute|minutes)\s/i, (m) => {
    durationSeconds = (durationSeconds ?? 0) + Math.round(Number(m[1]) * 60);
  });
  take(/\s(\d+(?:\.\d+)?)\s*(?:s|sec|secs|second|seconds)\s/i, (m) => {
    durationSeconds = (durationSeconds ?? 0) + Math.round(Number(m[1]));
  });

  let weight: Extracted["weight"] = null;
  take(/\s(\d+(?:\.\d+)?)\s*(?:kg|kgs|kilo|kilos|kilograms?)\s/i, (m) => {
    weight = { value: Number(m[1]), unit: "kg", explicitUnit: true };
  });
  if (!weight) {
    take(/\s(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?|#)\s/i, (m) => {
      weight = { value: Number(m[1]), unit: "lb", explicitUnit: true };
    });
  }

  let distanceM: number | null = null;
  take(/\s(\d+(?:\.\d+)?)\s*(?:km|kilometers?|kilometres?)\s/i, (m) => {
    distanceM = Number(m[1]) * 1000;
  });
  take(/\s(\d+(?:\.\d+)?)\s*(?:mi|miles?)\s/i, (m) => {
    distanceM = (distanceM ?? 0) + Number(m[1]) * M_PER_MILE;
  });
  take(/\s(\d+(?:\.\d+)?)\s*(?:yds?|yards?)\s/i, (m) => {
    distanceM = (distanceM ?? 0) + Number(m[1]) * M_PER_YARD;
  });
  take(/\s(\d+(?:\.\d+)?)\s*(?:m|meters?|metres?)\s/i, (m) => {
    distanceM = (distanceM ?? 0) + Number(m[1]);
  });
  if (distanceM !== null) distanceM = roundTo(distanceM, 2);

  // `@N`: a bare small number after an at-sign is an RPE, a large one is load.
  if (!weight) {
    take(/\s@\s*(\d+(?:\.\d+)?)\s/, (m) => {
      const value = Number(m[1]);
      if (value <= 10 && rpe === null) {
        rpe = value;
        issues.push(
          issue(
            "ambiguous_rpe_or_weight",
            "info",
            `Read "@${m[1]}" as RPE ${value}; it could also be a ${value}${ctx.defaultUnit} load.`,
            segment.trim(),
          ),
        );
      } else {
        weight = { value, unit: ctx.defaultUnit, explicitUnit: false };
      }
    });
  }

  if (isBodyweight && added) {
    weight = added;
  }

  return {
    rest: rest.replace(/\s+/g, " ").trim(),
    isWarmup,
    toFailure,
    isBodyweight,
    unreadable,
    weight,
    durationSeconds,
    distanceM,
    rpe,
    notes,
    issues,
  };
}

function parseUnit(token: string): WeightUnit {
  return /^lb|^pound|^#/i.test(token) ? "lb" : "kg";
}

function emptySet(rawText: string): ParsedSet {
  return {
    reps: null,
    repsMin: null,
    repsMax: null,
    weightKg: null,
    originalWeight: null,
    isBodyweight: false,
    durationSeconds: null,
    distanceM: null,
    rpe: null,
    isWarmup: false,
    toFailure: false,
    unreadable: false,
    rawText,
    confidence: 0.9,
    notes: [],
    issues: [],
  };
}

interface SegmentResult {
  sets: ParsedSet[];
  /** True when `AxB` was read as load x reps rather than sets x reps. */
  readAsWeightByReps: boolean;
  /** True when `AxB` was present at all, i.e. the consistency pass can revisit it. */
  hasAxB: boolean;
  unparsed: string | null;
  detectedUnit: WeightUnit | null;
}

function buildSet(
  mods: Extracted,
  rawText: string,
  ctx: SegmentContext,
): ParsedSet {
  const set = emptySet(rawText);
  set.isWarmup = mods.isWarmup;
  set.toFailure = mods.toFailure;
  set.isBodyweight = mods.isBodyweight;
  set.unreadable = mods.unreadable;
  set.durationSeconds = mods.durationSeconds;
  set.distanceM = mods.distanceM;
  set.rpe = mods.rpe;
  set.notes = [...mods.notes];
  set.issues = [...mods.issues];

  if (mods.weight) {
    set.originalWeight = { value: mods.weight.value, unit: mods.weight.unit };
    set.weightKg = toKg(mods.weight.value, mods.weight.unit);
    if (!mods.weight.explicitUnit) {
      set.notes.push(`unit not written; assumed ${ctx.defaultUnit}`);
      set.issues.push(
        issue(
          "ambiguous_unit",
          "info",
          `No unit written next to ${mods.weight.value}; assumed ${ctx.defaultUnit}.`,
          rawText,
        ),
      );
    }
  }

  return set;
}

function cloneSet(set: ParsedSet, index: number): ParsedSet {
  return {
    ...set,
    notes: [...set.notes],
    issues: set.issues.map((i) => ({ ...i })),
    rawText: set.rawText,
    reps: set.reps,
    // `setIndex` lives on the draft, not here; index only disambiguates clones.
    ...(index >= 0 ? {} : {}),
  };
}

function expand(set: ParsedSet, count: number): ParsedSet[] {
  if (count <= 1) return [set];
  const out: ParsedSet[] = [];
  for (let i = 0; i < count; i += 1) {
    const copy = cloneSet(set, i);
    copy.notes = [...copy.notes, `set ${i + 1} of ${count} written as a multiplier`];
    copy.issues = [
      ...copy.issues.map((x) => ({ ...x })),
      issue(
        "set_count_inferred",
        "info",
        `${count} sets expanded from a "${count}x" multiplier, not from ${count} written lines.`,
        set.rawText,
      ),
    ];
    out.push(copy);
  }
  return out;
}

function applyReps(set: ParsedSet, reps: number): void {
  set.reps = reps;
  if (!isPlausible("reps", reps)) {
    set.issues.push(
      issue(
        "implausible_value",
        "warning",
        `${reps} reps is outside the expected range.`,
        set.rawText,
      ),
    );
    set.confidence = Math.min(set.confidence, 0.4);
  }
}

function applyRepRange(set: ParsedSet, min: number, max: number): void {
  set.repsMin = min;
  set.repsMax = max;
  set.reps = null;
  set.issues.push(
    issue(
      "rep_range",
      "warning",
      `Written as a ${min}-${max} rep range; actual reps performed are unknown.`,
      set.rawText,
    ),
  );
  set.confidence = Math.min(set.confidence, 0.6);
}

function applyWeight(
  set: ParsedSet,
  value: number,
  ctx: SegmentContext,
  rawText: string,
): void {
  set.originalWeight = { value, unit: ctx.defaultUnit };
  set.weightKg = toKg(value, ctx.defaultUnit);
  set.notes.push(`unit not written; assumed ${ctx.defaultUnit}`);
  if (!isPlausible("weightKg", set.weightKg)) {
    set.issues.push(
      issue(
        "implausible_value",
        "warning",
        `${value}${ctx.defaultUnit} is outside the expected load range.`,
        rawText,
      ),
    );
    set.confidence = Math.min(set.confidence, 0.4);
  }
}

/** Parses one comma-delimited chunk of notation, e.g. `70x6` or `3x8 @60kg`. */
function parseSegment(rawSegment: string, ctx: SegmentContext): SegmentResult {
  const rawText = rawSegment.trim();
  const mods = extractModifiers(rawText, ctx);
  const detectedUnit = mods.weight?.explicitUnit ? mods.weight.unit : null;
  const base = buildSet(mods, rawText, ctx);
  let remainder = mods.rest.replace(/^[@,;.\s]+|[@,;.\s]+$/g, "").trim();

  // A leading "3 sets of" / "3 sets x" prefix.
  let setCount: number | null = null;
  const setsPrefix = remainder.match(
    /^(\d+)\s*sets?\b\s*(?:of|x|\*)?\s*(.*)$/i,
  );
  if (setsPrefix) {
    setCount = Number(setsPrefix[1]);
    remainder = setsPrefix[2].trim();
  }

  let readAsWeightByReps = false;
  let hasAxB = false;
  let unparsed: string | null = null;

  const finish = (sets: ParsedSet[]): SegmentResult => ({
    sets,
    readAsWeightByReps,
    hasAxB,
    unparsed,
    detectedUnit,
  });

  // `5/5/5` — one set per number.
  const slash = remainder.match(/^(\d+(?:\s*\/\s*\d+)+)$/);
  if (slash) {
    const reps = slash[1].split("/").map((n) => Number(n.trim()));
    return finish(
      reps.map((r) => {
        const s = cloneSet(base, -1);
        s.rawText = rawText;
        applyReps(s, r);
        return s;
      }),
    );
  }

  // `A x B` (optionally `A x B-C`).
  const axb = remainder.match(
    /^(\d+(?:\.\d+)?)\s*[x*]\s*(\d+)(?:\s*-\s*(\d+))?$/i,
  );
  if (axb) {
    hasAxB = true;
    const a = Number(axb[1]);
    const b = Number(axb[2]);
    const bMax = axb[3] ? Number(axb[3]) : null;

    const aLooksLikeLoad =
      ctx.forceWeightByReps === true ||
      (ctx.forceWeightByReps !== false &&
        (!Number.isInteger(a) || a > MAX_PLAUSIBLE_SET_COUNT));

    if (aLooksLikeLoad && mods.weight === null && bMax === null) {
      readAsWeightByReps = true;
      const s = cloneSet(base, -1);
      s.rawText = rawText;
      applyWeight(s, a, ctx, rawText);
      applyReps(s, b);
      return finish([s]);
    }

    const s = cloneSet(base, -1);
    s.rawText = rawText;
    if (bMax !== null) applyRepRange(s, b, bMax);
    else applyReps(s, b);
    const count = setCount ?? a;
    if (a > MAX_PLAUSIBLE_SET_COUNT) {
      s.issues.push(
        issue(
          "ambiguous_sets_or_weight",
          "warning",
          `Read "${axb[0]}" as ${a} sets; it may be a ${a}${ctx.defaultUnit} load instead.`,
          rawText,
        ),
      );
      s.confidence = Math.min(s.confidence, 0.5);
    }
    return finish(expand(s, count));
  }

  // `3x` / `3 sets` with the payload (duration, distance) already extracted.
  const bareMultiplier = remainder.match(/^(\d+)\s*[x*]$/i);
  if (bareMultiplier) {
    setCount = Number(bareMultiplier[1]);
    remainder = "";
  }

  // `x8` — reps only, load supplied elsewhere in the segment.
  const leadingX = remainder.match(/^[x*]\s*(\d+)(?:\s*-\s*(\d+))?$/i);
  if (leadingX) {
    const s = cloneSet(base, -1);
    s.rawText = rawText;
    if (leadingX[2]) applyRepRange(s, Number(leadingX[1]), Number(leadingX[2]));
    else applyReps(s, Number(leadingX[1]));
    return finish(expand(s, setCount ?? 1));
  }

  // `8 reps`, `8`, `8-10`.
  const repsOnly = remainder.match(/^(\d+)(?:\s*-\s*(\d+))?\s*(?:reps?)?$/i);
  if (repsOnly && remainder !== "") {
    const s = cloneSet(base, -1);
    s.rawText = rawText;
    if (repsOnly[2]) applyRepRange(s, Number(repsOnly[1]), Number(repsOnly[2]));
    else applyReps(s, Number(repsOnly[1]));
    return finish(expand(s, setCount ?? 1));
  }

  if (remainder === "") {
    const s = cloneSet(base, -1);
    s.rawText = rawText;
    const carriesSomething =
      s.durationSeconds !== null ||
      s.distanceM !== null ||
      s.weightKg !== null ||
      s.isBodyweight ||
      s.toFailure ||
      s.unreadable;
    if (!carriesSomething) {
      return finish([]);
    }
    return finish(expand(s, setCount ?? 1));
  }

  // Something is there and we do not understand it. Emit an explicit
  // unreadable set rather than pretending the segment was empty.
  unparsed = remainder;
  const s = cloneSet(base, -1);
  s.rawText = rawText;
  s.unreadable = true;
  s.confidence = 0;
  s.issues.push(
    issue(
      "notation_unparsed",
      "blocker",
      `Could not interpret "${remainder}".`,
      rawText,
    ),
  );
  return finish(expand(s, setCount ?? 1));
}

// ---------------------------------------------------------------------------
// Public parsing entry points
// ---------------------------------------------------------------------------

/**
 * Parses just the notation half of a line (everything after the exercise
 * name), e.g. `"60x8, 70x6, 80x4"` or `"3x8 @60kg"`.
 */
export function parseSetNotation(
  text: string,
  options: ParseOptions = {},
): { sets: ParsedSet[]; unparsed: string[]; detectedUnit: WeightUnit | null } {
  const defaultUnit = options.defaultUnit ?? "kg";
  const normalized = normalizeNotation(text);
  if (!normalized) return { sets: [], unparsed: [], detectedUnit: null };

  const segments = normalized
    .split(/[,;]|\s+then\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);

  const ctx: SegmentContext = { defaultUnit };
  const first = segments.map((segment) => parseSegment(segment, ctx));

  // Consistency pass: `60x8, 70x6, 80x4` should not have one member read as
  // sets x reps just because its first number happens to be small.
  const anyWeightByReps = first.some((r) => r.readAsWeightByReps);
  const results =
    anyWeightByReps && segments.length > 1
      ? segments.map((segment) =>
          parseSegment(segment, { ...ctx, forceWeightByReps: true }),
        )
      : first;

  const sets = results.flatMap((r) => r.sets);
  const unparsed = results
    .map((r) => r.unparsed)
    .filter((u): u is string => u !== null);
  const detectedUnit =
    results.find((r) => r.detectedUnit !== null)?.detectedUnit ?? null;

  // A line that mixed several `AxB` groups without units stays flagged.
  if (!anyWeightByReps && segments.length > 1) {
    const axbCount = results.filter((r) => r.hasAxB).length;
    if (axbCount > 1) {
      for (const set of sets) {
        set.issues.push(
          issue(
            "ambiguous_sets_or_weight",
            "info",
            "Several AxB groups on one line; read as sets x reps. Check whether the first number is a load.",
            normalized,
          ),
        );
      }
    }
  }

  return { sets, unparsed, detectedUnit };
}

const SUPERSET_PREFIX = /^([A-Ha-h])([1-9])\s*[).:\-]\s*/;
const LIST_PREFIX = /^(?:[-*\u2022]|\d{1,2}[).])\s*/;
const REST_PATTERNS: RegExp[] = [
  /\brest\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(s|sec|secs|seconds?|m|min|mins|minutes?)\b/i,
  /\b(\d+(?:\.\d+)?)\s*(s|sec|secs|seconds?|m|min|mins|minutes?)\s*rest\b/i,
  /\brest\s*[:=]?\s*(\d+):([0-5]\d)\b/,
];

/** Parses a single `"Bench Press 3x8 @60kg"`-style line. */
export function parseExerciseLine(
  rawLine: string,
  options: ParseOptions = {},
): ParsedLine {
  const defaultUnit = options.defaultUnit ?? "kg";
  const raw = normalizeNotation(rawLine);
  const issues: ExtractionIssue[] = [];

  let working = raw;
  let supersetGroup: string | null = null;

  const superset = working.match(SUPERSET_PREFIX);
  if (superset) {
    supersetGroup = superset[1].toUpperCase();
    working = working.slice(superset[0].length);
    issues.push(
      issue(
        "superset_detected",
        "info",
        `Marked "${supersetGroup}${superset[2]}" — grouped as superset ${supersetGroup}.`,
        raw,
      ),
    );
  } else {
    const ssWord = working.match(/^(?:ss|superset)\s*[:\-]\s*/i);
    if (ssWord) {
      supersetGroup = "SS";
      working = working.slice(ssWord[0].length);
      issues.push(
        issue("superset_detected", "info", "Line marked as a superset.", raw),
      );
    } else {
      working = working.replace(LIST_PREFIX, "");
    }
  }

  // Trailing parenthetical is a note, not notation, unless it is all numbers.
  let notes: string | null = null;
  const paren = working.match(/\(([^)]*[a-z][^)]*)\)\s*$/i);
  if (paren && !isValueToken(paren[1])) {
    notes = paren[1].trim();
    working = working.slice(0, paren.index).trim();
  }

  let restSeconds: number | null = null;
  for (const re of REST_PATTERNS) {
    const m = working.match(re);
    if (!m) continue;
    if (re.source.includes("[0-5]")) {
      restSeconds = Number(m[1]) * 60 + Number(m[2]);
    } else {
      const unit = m[2].toLowerCase();
      const value = Number(m[1]);
      restSeconds = unit.startsWith("m") ? Math.round(value * 60) : Math.round(value);
    }
    working = working.replace(re, " ").replace(/\s+/g, " ").trim();
    break;
  }

  const { label, setText } = splitLabelAndNotation(working);
  const parsed = setText
    ? parseSetNotation(setText, { defaultUnit })
    : { sets: [], unparsed: [], detectedUnit: null };

  let sets = parsed.sets;

  // `20 push ups` — a leading count with no notation region means reps.
  if (sets.length === 0 && setText === null) {
    const leadingCount = label.match(/^(\d+)\s+(.*\S)$/);
    if (leadingCount && Number(leadingCount[1]) <= 100) {
      const s = emptySet(raw);
      applyReps(s, Number(leadingCount[1]));
      s.notes.push("reps taken from the number in front of the exercise name");
      sets = [s];
      return finalizeLine({
        raw,
        label: leadingCount[2],
        setText: leadingCount[1],
        sets,
        restSeconds,
        supersetGroup,
        notes,
        detectedUnit: null,
        unparsed: [],
        issues,
      });
    }
  }

  if (sets.length === 0) {
    issues.push(
      issue(
        "unreadable_set",
        "warning",
        "No sets could be read for this exercise.",
        raw,
      ),
    );
  }

  for (const u of parsed.unparsed) {
    issues.push(
      issue("notation_unparsed", "warning", `Unread notation: "${u}".`, raw),
    );
  }

  return finalizeLine({
    raw,
    label,
    setText,
    sets,
    restSeconds,
    supersetGroup,
    notes,
    detectedUnit: parsed.detectedUnit,
    unparsed: parsed.unparsed,
    issues,
  });
}

function finalizeLine(line: Omit<ParsedLine, "confidence">): ParsedLine {
  // A trailing RPE that applies to the whole line fills in the blanks.
  const rpes = line.sets.map((s) => s.rpe).filter((r): r is number => r !== null);
  if (rpes.length === 1 && line.sets.length > 1) {
    for (const set of line.sets) {
      if (set.rpe === null) {
        set.rpe = rpes[0];
        set.notes.push("RPE applied from the end of the line");
      }
    }
  }

  for (const set of line.sets) {
    if (set.rpe !== null && !isPlausible("rpe", set.rpe)) {
      set.issues.push(
        issue(
          "implausible_value",
          "warning",
          `RPE ${set.rpe} is outside 1-10.`,
          set.rawText,
        ),
      );
      set.rpe = null;
    }
    if (set.unreadable) set.confidence = 0;
  }

  const setConfidences = line.sets.map((s) => s.confidence);
  const confidence =
    line.sets.length === 0
      ? 0.2
      : roundTo(
          Math.min(...setConfidences) * 0.4 +
            (setConfidences.reduce((a, b) => a + b, 0) / setConfidences.length) *
              0.6,
          2,
        );

  return { ...line, confidence };
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function isoDate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return d.toISOString().slice(0, 10);
}

function fullYear(value: number): number {
  if (value >= 1000) return value;
  return value >= 70 ? 1900 + value : 2000 + value;
}

/**
 * Best-effort date reader for whatever is scrawled at the top of the page.
 *
 * Day-first is assumed for `12/3` because the user writes dates the metric
 * way; when both numbers could be a month the result is flagged ambiguous so
 * the UI can ask instead of quietly filing the session three months early.
 */
export function parseWorkoutDate(
  text: string,
  options: ParseOptions = {},
): ParsedDate | null {
  const raw = normalizeNotation(text);
  if (!raw) return null;
  const lower = raw.toLowerCase();
  const today = options.today ? new Date(`${options.today}T00:00:00Z`) : null;

  const iso = lower.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) {
    const value = isoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
    if (value) return { iso: value, raw: iso[0], ambiguous: false, confidence: 0.98 };
  }

  const monthName = MONTHS.map((m) => m.slice(0, 3)).join("|");

  const dMonth = lower.match(
    new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthName})[a-z]*\\.?(?:\\s+(\\d{2,4}))?\\b`),
  );
  if (dMonth) {
    const year = dMonth[3]
      ? fullYear(Number(dMonth[3]))
      : (today?.getUTCFullYear() ?? new Date().getUTCFullYear());
    const month = MONTHS.findIndex((m) => m.startsWith(dMonth[2])) + 1;
    const value = isoDate(year, month, Number(dMonth[1]));
    if (value) {
      return {
        iso: value,
        raw: dMonth[0],
        ambiguous: false,
        confidence: dMonth[3] ? 0.95 : 0.8,
      };
    }
  }

  const monthD = lower.match(
    new RegExp(`\\b(${monthName})[a-z]*\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?(?:\\s+(\\d{2,4}))?\\b`),
  );
  if (monthD) {
    const year = monthD[3]
      ? fullYear(Number(monthD[3]))
      : (today?.getUTCFullYear() ?? new Date().getUTCFullYear());
    const month = MONTHS.findIndex((m) => m.startsWith(monthD[1])) + 1;
    const value = isoDate(year, month, Number(monthD[2]));
    if (value) {
      return {
        iso: value,
        raw: monthD[0],
        ambiguous: false,
        confidence: monthD[3] ? 0.95 : 0.8,
      };
    }
  }

  const numeric = lower.match(/\b(\d{1,2})[/.\-](\d{1,2})(?:[/.\-](\d{2,4}))?\b/);
  if (numeric) {
    const a = Number(numeric[1]);
    const b = Number(numeric[2]);
    const year = numeric[3]
      ? fullYear(Number(numeric[3]))
      : (today?.getUTCFullYear() ?? new Date().getUTCFullYear());
    // Day-first unless that is impossible.
    const dayFirst = a <= 31 && b <= 12;
    const value = dayFirst ? isoDate(year, b, a) : isoDate(year, a, b);
    if (value) {
      const ambiguous = a <= 12 && b <= 12 && a !== b;
      return {
        iso: value,
        raw: numeric[0],
        ambiguous,
        confidence: ambiguous ? 0.5 : 0.85,
      };
    }
  }

  if (today) {
    if (/\btoday\b/.test(lower)) {
      return {
        iso: today.toISOString().slice(0, 10),
        raw: "today",
        ambiguous: false,
        confidence: 0.9,
      };
    }
    if (/\byesterday\b/.test(lower)) {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() - 1);
      return {
        iso: d.toISOString().slice(0, 10),
        raw: "yesterday",
        ambiguous: false,
        confidence: 0.9,
      };
    }
    const weekday = WEEKDAYS.findIndex((w) =>
      new RegExp(`\\b${w.slice(0, 3)}[a-z]*\\b`).test(lower),
    );
    if (weekday >= 0) {
      const d = new Date(today);
      const delta = (d.getUTCDay() - weekday + 7) % 7;
      d.setUTCDate(d.getUTCDate() - delta);
      return {
        iso: d.toISOString().slice(0, 10),
        // A bare weekday only pins a date within the last seven days.
        raw: raw.match(new RegExp(`\\b${WEEKDAYS[weekday].slice(0, 3)}[a-z]*\\b`, "i"))?.[0] ?? raw,
        ambiguous: true,
        confidence: 0.45,
      };
    }
  }

  return null;
}

const DURATION_LINE =
  /\b(?:duration|total|time)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(?:min|mins|minutes?|h|hr|hrs|hours?)\b/i;

/**
 * Parses a whole page of transcribed text into a header plus exercise lines.
 * Used when the model returns a transcript it could not structure, and by
 * `extractWorkoutFromText` for pasted notes.
 */
export function parseWorkoutText(
  text: string,
  options: ParseOptions = {},
): ParsedWorkoutText {
  const issues: ExtractionIssue[] = [];
  const rawLines = text
    .split(/\r?\n/)
    .map((l) => normalizeNotation(l))
    .filter((l) => l.length > 0);

  let date: string | null = null;
  let dateRaw: string | null = null;
  let dateAmbiguous = false;
  let title: string | null = null;
  let durationMinutes: number | null = null;
  const lines: ParsedLine[] = [];

  for (const [index, line] of rawLines.entries()) {
    const durationMatch = line.match(DURATION_LINE);
    if (durationMatch && !/[x*]\s*\d/.test(line)) {
      const value = Number(durationMatch[1]);
      durationMinutes = /h/i.test(durationMatch[0].split(/\s/).pop() ?? "")
        ? Math.round(value * 60)
        : Math.round(value);
      continue;
    }

    const headerZone = index < 3;
    if (date === null && headerZone) {
      const parsedDate = parseWorkoutDate(line, options);
      const looksLikeSets = /\d\s*[x*]\s*\d|\breps?\b|\bsets?\b/i.test(line);
      if (parsedDate && !looksLikeSets) {
        date = parsedDate.iso;
        dateRaw = parsedDate.raw;
        dateAmbiguous = parsedDate.ambiguous;
        if (parsedDate.ambiguous) {
          issues.push(
            issue(
              "date_ambiguous",
              "warning",
              `Date "${parsedDate.raw}" is ambiguous; read as ${parsedDate.iso}.`,
              line,
            ),
          );
        }
        const leftover = line.replace(parsedDate.raw, "").replace(/^[\s\-–—:]+|[\s\-–—:]+$/g, "");
        if (leftover && title === null && !/\d/.test(leftover)) title = leftover;
        continue;
      }
    }

    const hasDigits = /\d/.test(line);
    if (!hasDigits && title === null && headerZone) {
      title = line.replace(/[:：]\s*$/, "");
      continue;
    }

    lines.push(parseExerciseLine(line, options));
  }

  if (date === null) {
    issues.push(
      issue("date_missing", "warning", "No date was found on the page."),
    );
  }

  return { date, dateRaw, dateAmbiguous, title, durationMinutes, lines, issues };
}
