/**
 * import-tracker.ts — import Krish_Tracker.xlsx into the dashboard database.
 *
 *   pnpm dlx tsx scripts/import-tracker.ts --dry-run
 *   pnpm dlx tsx scripts/import-tracker.ts --commit
 *
 * Requires `xlsx` (SheetJS) and `pg`. `pg` is already a dependency; add `xlsx` and `tsx`:
 *   npm i -D xlsx tsx
 *
 * Dry-run is the DEFAULT. Nothing is written unless --commit is passed explicitly.
 *
 * Verified dry-run against the current file: 10 questions, 1258 question_responses,
 * 164 health_metrics, 87 workouts, 0 rows for workout_exercises / workout_sets / meals /
 * food_entries / insights. 1 warning (a weekday typo on 2024-07-10).
 *
 * ---------------------------------------------------------------------------
 * ASSUMPTIONS
 * ---------------------------------------------------------------------------
 * Reconciled against dashboard/src/db/schema/: tables live in the `hub` schema.
 * Every column name the script writes is declared in the COLUMNS block.
 *
 * Specific assumptions, all justified in docs/SPREADSHEET_ANALYSIS.md:
 *
 *  1. Sheet name -> year. The 2024 block has no year in the tab name; it is recovered from
 *     the weekday text in column A and hardcoded in SHEET_YEARS. Weekdays are re-validated
 *     at parse time and mismatches are warned about, not fatal.
 *  2. Habit answers are three-state (yes / partial / no), not boolean. `1/2` is a real value
 *     the user uses 21 times. Stored as text with a numeric weight (1 / 0.5 / 0).
 *  3. A blank cell means "not logged" and produces NO row. Only an explicit `x` produces a
 *     "no". Never backfill false.
 *  4. `questions.key` is a stable slug and the natural key for upserts.
 *  5. question_responses is unique on (question_id, date); health_metrics on
 *     (date, metric, source); workouts on (date, activity, source).
 *  6. Zero rows go to workout_exercises / workout_sets / meals / food_entries — the
 *     spreadsheet contains no exercises, sets, meals or foods at all.
 */

import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { Client } from 'pg';
import * as XLSX from 'xlsx';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const XLSX_PATH =
  process.env.TRACKER_XLSX ??
  join(
    homedir(),
    'Library/Mobile Documents/com~apple~CloudDocs/Downloads/Krish_Tracker.xlsx',
  );

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://krishsaraf@localhost:5432/log_all';

/** Matches `hub.source` enum. Do not use a free-text source string. */
const SOURCE = 'import';

/** Canonical metric key from `HEALTH_METRICS` in src/db/schema/health.ts. */
const WEIGHT_METRIC = 'weight_kg';

/** Column names this script writes to. Matches dashboard/src/db/schema/. */
const COLUMNS = {
  questions: {
    table: 'hub.questions',
    key: 'key',
    label: 'label',
    type: 'type',
    config: 'config',
    cadence: 'cadence',
    isActive: 'is_active',
    orderIndex: 'order_index',
  },
  questionResponses: {
    table: 'hub.question_responses',
    questionId: 'question_id',
    date: 'date',
    valueNumeric: 'value_numeric',
    valueBool: 'value_bool',
    valueText: 'value_text',
    note: 'note',
  },
  healthMetrics: {
    table: 'hub.health_metrics',
    date: 'date',
    metric: 'metric',
    value: 'value',
    unit: 'unit',
    source: 'source',
  },
  workouts: {
    table: 'hub.workouts',
    date: 'date',
    name: 'name',
    notes: 'notes',
    source: 'source',
  },
} as const;

// ---------------------------------------------------------------------------
// Sheet -> year. The 2024 tabs carry no year; resolved via weekday matching.
// ---------------------------------------------------------------------------

const SHEET_YEARS: Record<string, number> = {
  June: 2024, July: 2024, August: 2024,
  September: 2024, October: 2024, November: 2024,

  'May 25': 2025, 'June 25': 2025, 'July 25': 2025, 'Aug 25': 2025,
  'Sept 25': 2025, 'Oct 25': 2025, 'Nov 25': 2025, 'Dec 25': 2025,

  'July 26': 2026, 'Aug 26': 2026, 'Sep 26': 2026,
  'Oct 26': 2026, 'Nov 26': 2026, 'Dec 26': 2026,
};

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

// ---------------------------------------------------------------------------
// Question catalogue. Header text (across all three schema eras) -> question key.
// Headers moved position and were renamed twice, so we key on text, never index.
// ---------------------------------------------------------------------------

type QuestionType = 'rating' | 'boolean' | 'multiple_choice' | 'text' | 'number';

interface QuestionSeed {
  key: string;
  prompt: string;
  type: QuestionType;
  config: Record<string, unknown>;
  sortOrder: number;
  active: boolean;
  /** Every spreadsheet header that has ever meant this question. */
  headers: string[];
}

const THREE_STATE = {
  options: [
    { value: 'yes', label: 'Yes', weight: 1 },
    { value: 'partial', label: 'Partly', weight: 0.5 },
    { value: 'no', label: 'No', weight: 0 },
  ],
};

const YES_NO = { true_label: 'Yes', false_label: 'No' };

const QUESTIONS: QuestionSeed[] = [
  {
    key: 'gym', prompt: 'Gym', type: 'multiple_choice',
    config: THREE_STATE, sortOrder: 1, active: true, headers: ['Gym'],
  },
  {
    key: 'cardio_sport', prompt: 'Running', type: 'multiple_choice',
    config: {
      options: [
        { value: 'tennis', label: 'Tennis' },
        { value: 'cricket', label: 'Cricket' },
        { value: 'other', label: 'Other cardio' },
        { value: 'partial', label: 'Partly', weight: 0.5 },
        { value: 'no', label: 'No', weight: 0 },
      ],
      allow_multiple: true,
      allow_note: true,
    },
    sortOrder: 2, active: true, headers: ['Running'],
  },
  {
    key: 'diet', prompt: 'Diet', type: 'multiple_choice',
    config: {
      options: [
        { value: 'yes', label: 'Yes', weight: 1 },
        { value: 'partial', label: 'Half', weight: 0.5 },
        { value: 'no', label: 'No', weight: 0 },
      ],
    },
    // "Healthy Food" (2024/2025) was renamed to "Diet" in the 2026 template.
    sortOrder: 3, active: true, headers: ['Diet', 'Healthy Food'],
  },
  {
    key: 'protein', prompt: 'Protein', type: 'boolean',
    config: YES_NO, sortOrder: 4, active: true, headers: ['Protein'],
  },
  {
    key: 'morning_skincare', prompt: 'Morning skin care', type: 'boolean',
    // New in the 2026 template; no historical responses exist.
    config: YES_NO, sortOrder: 5, active: true, headers: ['Morn Skin Care'],
  },
  {
    key: 'night_clean', prompt: 'Night clean', type: 'multiple_choice',
    // "Bath" is a genuine third option the user writes in, not a typo (5 occurrences).
    config: {
      options: [
        { value: 'yes', label: 'Yes', weight: 1 },
        { value: 'bath', label: 'Bath', weight: 1 },
        { value: 'no', label: 'No', weight: 0 },
      ],
    },
    sortOrder: 6, active: true, headers: ['Night Clean'],
  },
  {
    key: 'brush', prompt: 'Brush', type: 'boolean',
    // "Brush+Braces" (2024) -> "Brush" (2026), braces presumably removed.
    config: YES_NO, sortOrder: 7, active: true, headers: ['Brush', 'Brush+Braces'],
  },
  {
    key: 'm', prompt: 'M', type: 'boolean',
    // Unlabelled single-letter habit, highest completion rate in the file. Meaning is
    // private to the user; seeded verbatim and flagged so the UI can offer a rename
    // and hide it in shared views. Do not guess a label.
    config: { ...YES_NO, private: true }, sortOrder: 8, active: true, headers: ['M'],
  },
  {
    key: 'doc_rehab', prompt: 'Doc Rehab', type: 'boolean',
    // New in the 2026 template; no historical responses exist.
    config: YES_NO, sortOrder: 9, active: true, headers: ['Doc Rehab'],
  },
  {
    key: 'multivitamin', prompt: 'Multivitamin', type: 'boolean',
    // Added Jul 2024, dropped from the 2026 template -> seeded as archived so the
    // June 2024 rows do not read as 30 days of missed doses.
    config: YES_NO, sortOrder: 10, active: false, headers: ['Multivitamin'],
  },
];

/**
 * "Meds?" appears only in the 2025 templates, which contain zero data. It occupies the
 * old Brush+Braces column but means something else, so it is deliberately NOT mapped.
 */
const IGNORED_HEADERS = new Set(['Date (Day)', 'Weight (kg)', 'Meds?', '']);

const HEADER_TO_QUESTION = new Map<string, QuestionSeed>();
for (const q of QUESTIONS) {
  for (const h of q.headers) HEADER_TO_QUESTION.set(h.toLowerCase(), q);
}

// ---------------------------------------------------------------------------
// Value normalisation
// ---------------------------------------------------------------------------

/** `1`/`0` appear only on 1-4 Jul 2024 before the user settled on ticks. Same meaning. */
const YES_TOKENS = new Set(['✓', '1', 'yes', 'y', 'true']);
const NO_TOKENS = new Set(['x', '0', 'no', 'n', 'false', '-']);
const PARTIAL_TOKENS = new Set(['1/2', '½', 'half']);

/** `Tenis` outnumbers the correct spelling 25 to 5. */
const SPORT_ALIASES: Record<string, string> = {
  tenis: 'Tennis',
  tennis: 'Tennis',
  cricket: 'Cricket',
};

interface NormalisedAnswer {
  value: string;
  numericValue: number | null;
  note: string | null;
  /** Sport names found in the cell, already de-aliased. */
  sports: string[];
}

function normaliseAnswer(questionKey: string, raw: unknown): NormalisedAnswer | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (s === '') return null;

  const lower = s.toLowerCase();

  if (YES_TOKENS.has(lower)) return { value: 'yes', numericValue: 1, note: null, sports: [] };
  if (NO_TOKENS.has(lower)) return { value: 'no', numericValue: 0, note: null, sports: [] };
  if (PARTIAL_TOKENS.has(lower)) {
    return { value: 'partial', numericValue: 0.5, note: null, sports: [] };
  }

  // "Bath" satisfies night_clean by a different route -> keep the variant, still a yes.
  if (questionKey === 'night_clean' && lower === 'bath') {
    return { value: 'bath', numericValue: 1, note: 'Bath', sports: [] };
  }

  // Free text in Gym / Running is a sport name that both marks the habit done AND says
  // what was done. "Tennis, Cricket" is two sessions in one cell.
  const parts = s.split(',').map((p) => p.trim()).filter(Boolean);
  const sports = parts
    .map((p) => SPORT_ALIASES[p.toLowerCase()])
    .filter((p): p is string => Boolean(p));

  if (sports.length > 0) {
    return {
      value: sports.length === 1 ? sports[0].toLowerCase() : 'multiple',
      numericValue: 1,
      note: sports.join(', '),
      sports,
    };
  }

  // Unrecognised free text: keep it verbatim rather than dropping data.
  return { value: 'other', numericValue: null, note: s, sports: [] };
}

// ---------------------------------------------------------------------------
// Date parsing
// ---------------------------------------------------------------------------

const WEEKDAYS = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
];

interface ParsedDate {
  iso: string;
  weekdayMismatch: string | null;
}

/**
 * Column A is always free text: "22nd October (Tuesday)". Tolerates a missing weekday
 * ("4th November"), a missing paren ("2nd September Monday)"), lowercase, and the one
 * known typo ("10th July (Wedesday)").
 */
function parseDateCell(raw: unknown, year: number): ParsedDate | null {
  if (typeof raw !== 'string') return null;
  const m = /^\s*(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)/.exec(raw.trim());
  if (!m) return null;

  const day = Number(m[1]);
  const monthIdx = MONTHS.indexOf(m[2].toLowerCase());
  if (monthIdx < 0) return null;

  const d = new Date(Date.UTC(year, monthIdx, day));
  if (d.getUTCMonth() !== monthIdx || d.getUTCDate() !== day) return null;

  let weekdayMismatch: string | null = null;
  const wd = /\(?\s*([A-Za-z]+)\s*\)/.exec(raw);
  if (wd) {
    const stated = wd[1].toLowerCase();
    const actual = WEEKDAYS[d.getUTCDay()];
    if (stated !== actual) weekdayMismatch = `"${raw}" says ${wd[1]}, ${year} says ${actual}`;
  }

  return { iso: d.toISOString().slice(0, 10), weekdayMismatch };
}

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

interface HealthMetricRow {
  date: string; metric: string; value: number; unit: string; source: string;
}
interface ResponseRow {
  questionKey: string; date: string;
  value: string; numericValue: number | null; note: string | null; source: string;
}
interface WorkoutRow {
  date: string; activity: string; notes: string | null; source: string;
}

interface Extraction {
  healthMetrics: HealthMetricRow[];
  responses: ResponseRow[];
  workouts: WorkoutRow[];
  warnings: string[];
  perSheet: Record<string, { year: number; days: number; logged: number; weights: number; responses: number }>;
  skippedSheets: string[];
}

function extract(path: string): Extraction {
  const wb = XLSX.read(readFileSync(path), { type: 'buffer', cellDates: false });

  const out: Extraction = {
    healthMetrics: [], responses: [], workouts: [],
    warnings: [], perSheet: {}, skippedSheets: [],
  };

  for (const sheetName of wb.SheetNames) {
    const year = SHEET_YEARS[sheetName];
    if (!year) {
      out.warnings.push(`Unknown sheet "${sheetName}" — no year mapping, skipped.`);
      continue;
    }

    // 2026 tabs are empty templates (plus one accidental weight). Do not import
    // them until the user supplies real 2026 tracking.
    if (year >= 2026) {
      out.skippedSheets.push(sheetName);
      continue;
    }

    const sheet = wb.Sheets[sheetName];
    const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1, raw: true, blankrows: false, defval: null,
    });
    if (grid.length === 0) { out.skippedSheets.push(sheetName); continue; }

    // Row 1 is the header. Note "May 25" has a blank A1 — harmless, col A is positional.
    const header = (grid[0] ?? []).map((h) => (h === null ? '' : String(h).trim()));
    const stats = { year, days: 0, logged: 0, weights: 0, responses: 0 };

    for (const row of grid.slice(1)) {
      const parsed = parseDateCell(row[0], year);
      if (!parsed) continue;
      stats.days += 1;
      if (parsed.weekdayMismatch) {
        out.warnings.push(`${sheetName}: ${parsed.weekdayMismatch}`);
      }

      let touched = false;

      for (let c = 1; c < header.length; c += 1) {
        const head = header[c];
        const raw = row[c];
        if (raw === null || raw === undefined || raw === '') continue;

        if (head === 'Weight (kg)') {
          const n = Number(raw);
          if (!Number.isFinite(n)) {
            out.warnings.push(`${sheetName} ${parsed.iso}: non-numeric weight ${JSON.stringify(raw)}`);
            continue;
          }
          out.healthMetrics.push({
            date: parsed.iso, metric: WEIGHT_METRIC, value: n, unit: 'kg', source: SOURCE,
          });
          stats.weights += 1;
          touched = true;
          continue;
        }

        if (IGNORED_HEADERS.has(head)) continue;

        const q = HEADER_TO_QUESTION.get(head.toLowerCase());
        if (!q) {
          out.warnings.push(`${sheetName}: unmapped column "${head}" — value ${JSON.stringify(raw)} dropped.`);
          continue;
        }

        const ans = normaliseAnswer(q.key, raw);
        if (!ans) continue;

        out.responses.push({
          questionKey: q.key, date: parsed.iso,
          value: ans.value, numericValue: ans.numericValue, note: ans.note, source: SOURCE,
        });
        stats.responses += 1;
        touched = true;

        // Derive workouts. A sport name in EITHER column is a sport session — `Tenis`
        // leaked into the Gym column once (21 Nov 2024) and belongs with tennis.
        if (ans.sports.length > 0) {
          for (const sport of ans.sports) {
            out.workouts.push({
              date: parsed.iso, activity: sport, notes: null, source: SOURCE,
            });
          }
        } else if (q.key === 'gym' && (ans.value === 'yes' || ans.value === 'partial')) {
          out.workouts.push({
            date: parsed.iso, activity: 'Gym',
            notes: ans.value === 'partial' ? 'Partial session' : null, source: SOURCE,
          });
        } else if (q.key === 'cardio_sport' && (ans.value === 'yes' || ans.value === 'partial')) {
          out.workouts.push({
            date: parsed.iso, activity: 'Cardio',
            notes: ans.value === 'partial' ? 'Partial session' : null, source: SOURCE,
          });
        }
      }

      if (touched) stats.logged += 1;
    }

    if (stats.logged === 0) out.skippedSheets.push(sheetName);
    out.perSheet[sheetName] = stats;
  }

  return out;
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

function report(x: Extraction, commit: boolean): void {
  const dates = [
    ...x.healthMetrics.map((r) => r.date),
    ...x.responses.map((r) => r.date),
  ].sort();

  console.log(`\n${commit ? 'IMPORT' : 'DRY RUN'} — ${XLSX_PATH}\n`);

  console.log('Per sheet');
  console.log('  sheet         year   days  logged  weights  responses');
  for (const [name, s] of Object.entries(x.perSheet)) {
    const flag = s.logged === 0 ? '   (empty template)' : '';
    console.log(
      `  ${name.padEnd(12)}  ${s.year}  ${String(s.days).padStart(5)}  ` +
      `${String(s.logged).padStart(6)}  ${String(s.weights).padStart(7)}  ` +
      `${String(s.responses).padStart(9)}${flag}`,
    );
  }

  const byQuestion = new Map<string, number>();
  for (const r of x.responses) byQuestion.set(r.questionKey, (byQuestion.get(r.questionKey) ?? 0) + 1);

  console.log('\nquestion_responses by question');
  for (const q of QUESTIONS) {
    console.log(`  ${q.key.padEnd(18)} ${String(byQuestion.get(q.key) ?? 0).padStart(5)}`);
  }

  const byValue = new Map<string, number>();
  for (const r of x.responses) byValue.set(r.value, (byValue.get(r.value) ?? 0) + 1);
  console.log('\nquestion_responses by answer value');
  for (const [v, n] of [...byValue].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${v.padEnd(18)} ${String(n).padStart(5)}`);
  }

  const byActivity = new Map<string, number>();
  for (const w of x.workouts) byActivity.set(w.activity, (byActivity.get(w.activity) ?? 0) + 1);
  console.log('\nworkouts by activity');
  for (const [a, n] of [...byActivity].sort((p, q) => q[1] - p[1])) {
    console.log(`  ${a.padEnd(18)} ${String(n).padStart(5)}`);
  }

  const weights = x.healthMetrics.map((r) => r.value);
  console.log('\nTotals');
  console.log(`  questions              ${QUESTIONS.length}  (${QUESTIONS.filter((q) => q.active).length} active, ${QUESTIONS.filter((q) => !q.active).length} archived)`);
  console.log(`  question_responses  ${String(x.responses.length).padStart(5)}`);
  console.log(`  health_metrics      ${String(x.healthMetrics.length).padStart(5)}  (${WEIGHT_METRIC}, kg; ${Math.min(...weights)}–${Math.max(...weights)})`);
  console.log(`  workouts            ${String(x.workouts.length).padStart(5)}`);
  console.log('  workout_exercises       0  (no exercises named anywhere in the file)');
  console.log('  workout_sets            0  (no sets/reps/load ever recorded)');
  console.log('  meals                   0  (diet is a tick, not a meal log)');
  console.log('  food_entries            0');
  console.log('  insights                0  (app-generated)');
  console.log(`\n  date range          ${dates[0]} .. ${dates[dates.length - 1]}`);
  console.log(`  distinct dates      ${new Set(dates).size}`);
  console.log(`  empty template sheets skipped  ${x.skippedSheets.length}  [${x.skippedSheets.join(', ')}]`);

  if (x.warnings.length > 0) {
    console.log(`\nWarnings (${x.warnings.length})`);
    for (const w of x.warnings) console.log(`  - ${w}`);
  }
}

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

async function load(x: Extraction): Promise<void> {
  const c = COLUMNS;
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    await client.query('BEGIN');

    // Questions. Upserted on `key` so re-running never duplicates the catalogue.
    const questionIds = new Map<string, string>();
    for (const q of QUESTIONS) {
      const res = await client.query<{ id: string }>(
        `INSERT INTO ${c.questions.table}
           (${c.questions.key}, ${c.questions.label}, ${c.questions.type},
            ${c.questions.config}, ${c.questions.cadence}, ${c.questions.isActive},
            ${c.questions.orderIndex})
         VALUES ($1, $2, $3, $4::jsonb, 'daily', $5, $6)
         ON CONFLICT (${c.questions.key}) DO UPDATE SET
           ${c.questions.label} = EXCLUDED.${c.questions.label},
           ${c.questions.type} = EXCLUDED.${c.questions.type},
           ${c.questions.config} = EXCLUDED.${c.questions.config},
           ${c.questions.isActive} = EXCLUDED.${c.questions.isActive},
           ${c.questions.orderIndex} = EXCLUDED.${c.questions.orderIndex}
         RETURNING id`,
        [q.key, q.prompt, q.type, JSON.stringify(q.config), q.active, q.sortOrder],
      );
      questionIds.set(q.key, res.rows[0].id);
    }

    const seedByKey = new Map(QUESTIONS.map((q) => [q.key, q]));

    for (const r of x.responses) {
      const qid = questionIds.get(r.questionKey);
      if (!qid) continue;
      const seed = seedByKey.get(r.questionKey);
      const valueBool =
        seed?.type === 'boolean'
          ? r.value === 'yes'
          : null;
      await client.query(
        `INSERT INTO ${c.questionResponses.table}
           (${c.questionResponses.questionId}, ${c.questionResponses.date},
            ${c.questionResponses.valueNumeric}, ${c.questionResponses.valueBool},
            ${c.questionResponses.valueText}, ${c.questionResponses.note})
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (${c.questionResponses.questionId}, ${c.questionResponses.date})
         DO UPDATE SET
           ${c.questionResponses.valueNumeric} = EXCLUDED.${c.questionResponses.valueNumeric},
           ${c.questionResponses.valueBool} = EXCLUDED.${c.questionResponses.valueBool},
           ${c.questionResponses.valueText} = EXCLUDED.${c.questionResponses.valueText},
           ${c.questionResponses.note} = EXCLUDED.${c.questionResponses.note}`,
        [qid, r.date, r.numericValue, valueBool, r.value, r.note],
      );
    }

    for (const m of x.healthMetrics) {
      await client.query(
        `INSERT INTO ${c.healthMetrics.table}
           (${c.healthMetrics.date}, ${c.healthMetrics.metric}, ${c.healthMetrics.value},
            ${c.healthMetrics.unit}, ${c.healthMetrics.source})
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (${c.healthMetrics.date}, ${c.healthMetrics.metric}, ${c.healthMetrics.source})
         DO UPDATE SET
           ${c.healthMetrics.value} = EXCLUDED.${c.healthMetrics.value},
           ${c.healthMetrics.unit} = EXCLUDED.${c.healthMetrics.unit}`,
        [m.date, m.metric, m.value, m.unit, m.source],
      );
    }

    // Multiple workouts per date are legitimate ("Tennis, Cricket" on 2024-06-12), so the
    // conflict target includes name.
    for (const w of x.workouts) {
      await client.query(
        `INSERT INTO ${c.workouts.table}
           (${c.workouts.date}, ${c.workouts.name}, ${c.workouts.notes}, ${c.workouts.source})
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (${c.workouts.date}, ${c.workouts.name}, ${c.workouts.source})
         DO UPDATE SET ${c.workouts.notes} = EXCLUDED.${c.workouts.notes}`,
        [w.date, w.activity, w.notes, w.source],
      );
    }

    await client.query('COMMIT');
    console.log('\nCommitted.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const commit = process.argv.includes('--commit');

  const x = extract(XLSX_PATH);
  report(x, commit);

  if (!commit) {
    console.log('\nDry run — nothing written. Re-run with --commit to load.');
    return;
  }
  await load(x);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
