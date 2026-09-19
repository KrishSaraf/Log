# Krish_Tracker.xlsx — Full Analysis

Source file: `~/Library/Mobile Documents/com~apple~CloudDocs/Downloads/Krish_Tracker.xlsx` (450,880 bytes,
materialised locally — no iCloud stub issues). Inspected with `openpyxl` (both `data_only=True` and
`data_only=False`) plus a raw unzip of the OOXML package.

Workbook properties: created `2025-01-02T11:21:38Z` by creator `Acer-PC`, no title, no defined names,
no `docProps/app.xml`. The shape of the package (one `drawing*.xml` per sheet, no `calcChain.xml`,
no `app.xml`) is the signature of a **Google Sheets → .xlsx export**.

## TL;DR

This is **not** a workout log. It is a **daily habit-and-weight tracker**: one sheet per calendar month,
one row per day, one column per habit, and the habit cells hold `✓` / `x` / `1/2` tick marks rather than
numbers. There are no exercises, no sets, no reps, no weights lifted, no meals, no calories, no macros,
no sleep, no mood, and no ratings anywhere in the file.

The only quantitative series in the entire workbook is **body weight in kilograms**.

## Sheet inventory

20 sheets, all `visible`, each named for a month. The year is *not* in the sheet name for the 2024 block;
it is recoverable because every date cell carries its weekday name (e.g. `1st June (Saturday)`), and
weekday-matching resolves the year unambiguously — 100% weekday agreement for 19 of 20 sheets and 30/31
for `July` (the single miss is the typo `10th July (Wedesday)`).

| Sheet | Resolved period | Date rows | Rows with data | Weight readings |
|---|---|---|---|---|
| `June` | Jun 2024 | 30 | 30 | 30 |
| `July` | Jul 2024 | 31 | 31 | 31 |
| `August` | Aug 2024 | 31 | 31 | 31 |
| `September` | Sep 2024 | 30 | 30 | 30 |
| `October` | Oct 2024 | 30 | 29 | 29 |
| `November` | Nov 2024 | 30 | 12 | 12 |
| `May 25` … `Dec 25` (8 sheets) | May–Dec 2025 | 233 | 0 | 0 |
| `July 26` … `Dec 26` (6 sheets) | Jul–Dec 2026 | 180 | 0 | 0 |
| **Total** | | **595** | **164** | **164** |

Sheet tab order is reverse-chronological for the 2026 block (`Dec 26` first) and chronological for the
older blocks, so tab order is not a reliable ordering signal — parse the names.

**Only six sheets contain real data**, all of them the 2024 block. The 2025 sheets are empty templates
that were pre-generated and never used. The 2026 sheets are likewise empty templates with one exception:
`Sep 26!B17` holds a single weight of `77.2` against `16th September (Wednesday)` —
i.e. someone opened the file and typed one number. **That row is intentionally NOT
imported** (and any previously imported 2026 rows were deleted): the user confirmed
2026 tracking is not ready yet and will provide it later.

**Year resolution for the unlabeled month tabs (`June`…`November`):** weekdays in
column A match **2024** exactly (e.g. `1st September (Sunday)` = 2024-09-01, not
2025). The `Sept 25` / `Oct 25` tabs exist but contain **zero** logged cells, so there
is no September/October **2025** data in this file to import.

Every sheet is padded out to row 996–1000 and often to column Z by the Sheets exporter; those rows and
columns are entirely empty. There are **zero** stray cells outside the header block on any sheet.

## Date representation

Column A on every sheet, always a **string**, never a real date value or serial number. The format is
`"<day><ordinal suffix> <MonthName> (<Weekday>)"`:

- `'1st June (Saturday)'`
- `'22nd October (Tuesday)'`
- `'31st December (Thursday)'`

The year is implicit in the sheet name. Variants that a parser must tolerate:

- Missing weekday entirely — `'4th November'` through `'30th November'` on the `November` sheet
  (the user stopped typing weekdays partway through the month).
- Missing opening paren — `'2nd September Monday)'`.
- Lowercase weekday — `'20th July (saturday)'`.
- Misspelled weekday — `'10th July (Wedesday)'`.
- On `May 25` the header cell `A1` is **blank** instead of `Date (Day)`.

A regex of the form `^\s*(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)` handles all 595 rows.

## Column schemas — three eras

The habit column set was revised twice. Note that column **positions shift between eras**, so the import
must key on the header text, not the column index.

**Era 1 — `June` (Jun 2024), 9 columns**

`Date (Day)` · `Weight (kg)` · `Gym` · `Running` · `Healthy Food` · `Night Clean` · `Brush+Braces` · `M` · `Protein`

**Era 2 — `July`…`November` (Jul–Nov 2024) and all 2025 sheets, 10 columns**

`Date (Day)` · `Weight (kg)` · `Gym` · `Running` · `Healthy Food` · `Night Clean` · `Brush+Braces` *(2024)* / `Meds?` *(2025)* · `M` · `Protein` · `Multivitamin`

`Multivitamin` was added on 1 Jul 2024. In the 2025 templates `Brush+Braces` was renamed to `Meds?` —
same column position, different meaning, and since the 2025 sheets are empty this rename carries no data.

**Era 3 — `July 26`…`Dec 26` (2026 templates), 11 columns**

`Date (Day)` · `Weight (kg)` · `Gym` · `Running` · `Diet` · `Protein` · `Morn Skin Care` · `Night Clean` · `Brush` · `M` · `Doc Rehab`

This is the user's **current intent**, and it is the most informative thing in the file even though it is
unfilled. Compared with 2024 the user has:

- renamed `Healthy Food` → `Diet`
- renamed `Brush+Braces` → `Brush` (braces presumably off)
- **dropped** `Multivitamin`
- **added** `Morn Skin Care` (a morning routine habit, paired with the existing evening `Night Clean`)
- **added** `Doc Rehab` (a physio / doctor-prescribed rehab protocol — strongly implies an injury)
- moved `Protein` up next to `Diet`, grouping nutrition together

## Value vocabulary

The workbook's `sharedStrings.xml` contains only **23 distinct strings in total**, which is the whole
vocabulary of the file. Excluding the 595 date strings and the 15 header strings, the complete set of
data values is:

`✓` · `x` · `1/2` · `Bath` · `Tennis` · `Tenis` · `Cricket` · `Tennis, Cricket`

Plus numeric cells: body weights, and a handful of `0`/`1` literals.

Distinct values per column across all populated cells (1,258 habit cells + 164 weights):

| Column | Cells | Distinct values and counts |
|---|---|---|
| `Weight (kg)` | 164 | floats 66.5 – 77.2 |
| `Gym` | 161 | `x` 118, `✓` 37, `1` 2, `0` 2, `1/2` 1, `Tenis` 1 |
| `Running` | 161 | `x` 112, `Tenis` 24, `✓` 8, `Cricket` 6, `Tennis` 4, `0` 4, `1/2` 2, `Tennis, Cricket` 1 |
| `Healthy Food` | 161 | `x` 103, `✓` 36, `1/2` 18, `0` 3, `1` 1 |
| `Night Clean` | 161 | `x` 94, `✓` 58, `Bath` 5, `0` 3, `1` 1 |
| `Brush+Braces` | 161 | `x` 145, `✓` 12, `0` 4 |
| `M` | 161 | `✓` 92, `x` 47, `0` 22 |
| `Protein` | 161 | `x` 118, `✓` 39, `0` 3, `1` 1 |
| `Multivitamin` | 131 | `✓` 72, `x` 55, `0` 2, `1` 2 |

Semantics:

- `✓` = done, `x` = not done. These are the dominant encoding.
- `1` / `0` appear only on 1–4 Jul 2024 (the first four rows of the `July` sheet) plus a scattering of
  `0`s in `June`'s `M` column. The user briefly experimented with binary digits then reverted to ticks.
  They are exact synonyms for `✓` / `x`.
- **`1/2` = partially done.** This is a genuine third state, not noise: it appears 18 times in
  `Healthy Food`, twice in `Running`, once in `Gym`. Excel mangled 9 of these cells into the `d-mmm`
  number format, but the stored value is still the text `1/2` — no data loss.
- `Bath` in `Night Clean` (5 occurrences) = an alternative way of satisfying the evening hygiene habit.
- In `Running`, a **sport name replaces the tick**: writing `Tenis` both marks the habit done and records
  what the activity was. `Tennis, Cricket` on one day means two activities.
- `M` is an unlabelled single-letter column. It is a plain boolean (`✓`/`x`/`0`) with the highest
  completion rate in the file (57%). Its meaning is private to the user; the app should carry it as an
  opaque user-defined boolean habit and let the user rename it.

### Activity vocabulary (the only "exercise names" in the file)

| Value | Occurrences | Note |
|---|---|---|
| `Tenis` | 25 | misspelling of Tennis; 24 in `Running`, 1 leaked into `Gym` on 21 Nov 2024 |
| `Cricket` | 7 | 6 standalone + 1 inside `Tennis, Cricket` |
| `Tennis` | 5 | 4 standalone + 1 inside `Tennis, Cricket` |

After normalising the misspelling: **Tennis 30 sessions, Cricket 7 sessions**. Neither of these exists in
the `exercises` Postgres table (876 rows, 14 of which are `cardio`, all treadmill/trail variants such as
`Running, Treadmill` and `Trail Running/Walking`). There is nothing in the spreadsheet that matches a
strength-exercise name, so **exercise-name matching against `exercises` yields zero useful hits** —
the table stays purely as a picker catalogue for future logging.

## Coverage, gaps, and the weight series

Real logging: **2024-06-01 → 2024-11-26**, 163 logged days out of a 179-day span (91% adherence to the
act of logging itself), then a **658-day gap**, then one isolated entry on **2026-09-16**.

Missing-day runs inside the 2024 stretch, all in November as the habit decayed:

| Gap | Days missed |
|---|---|
| 2024-10-30 → 2024-11-04 | 6 |
| 2024-11-07 → 2024-11-13 | 7 |
| 2024-11-16 → 2024-11-18 | 3 |
| 2024-11-27 → 2026-09-15 | 658 |

Weight (kg, one decimal place except a single `69.95`; 164 readings, min 66.5, max 77.2):

| Month | n | avg | min | max |
|---|---|---|---|---|
| Jun 2024 | 30 | 73.5 | 71.0 | 75.4 |
| Jul 2024 | 31 | 70.6 | 68.9 | 73.0 |
| Aug 2024 | 31 | 71.4 | 69.2 | 73.2 |
| Sep 2024 | 30 | 68.9 | 66.9 | 71.7 |
| Oct 2024 | 29 | 68.4 | 66.5 | 70.2 |
| Nov 2024 | 12 | 69.5 | 68.6 | 70.6 |
| Sep 2026 | 1 | 77.2 | 77.2 | 77.2 |

The narrative: 75.0 kg on 1 Jun 2024 down to 66.5 kg by late Oct 2024, drifting back up to 68.8 kg by the
last logged day of the run — and then **77.2 kg on 2026-09-16**, about 8 kg above where the tracking
stopped. The single most likely reason the user wants a dashboard right now is visible in that one cell.

## Habit completion rates (2024 run, 161 logged days)

| Habit | Logged | `✓` | `1/2` | `x` | Other | Done % |
|---|---|---|---|---|---|---|
| `M` | 161 | 92 | 0 | 69 | — | 57.1% |
| `Multivitamin` | 131 | 74 | 0 | 57 | — | 56.5% |
| `Night Clean` | 161 | 59 | 0 | 97 | 5 (`Bath`) | 36.6% |
| `Protein` | 161 | 40 | 0 | 121 | — | 24.8% |
| `Gym` | 161 | 39 | 1 | 120 | 1 (`Tenis`) | 24.2% |
| `Healthy Food` | 161 | 37 | 18 | 106 | — | 23.0% |
| `Brush+Braces` | 161 | 12 | 0 | 149 | — | 7.5% |
| `Running` | 161 | 8 | 2 | 116 | 35 (sport names) | 5.0% plain, 27.9% incl. sports |

Important: the user records `x` explicitly rather than leaving a blank. A blank means *"I did not open the
spreadsheet that day"*; an `x` means *"I opened it and I did not do this"*. That distinction is real data
and the app must preserve it — `x` and blank are **not** the same and must not both become `false`.

## Derived values, formulas, aggregations

**There are none.** Concretely, across all 20 sheets:

- 0 formulas (no `calcChain.xml` in the package)
- 0 merged cells
- 0 conditional formatting rules
- 0 data validation rules (the `✓`/`x` vocabulary is convention, not a dropdown)
- 0 charts, 0 images, 0 cell comments
- 0 freeze panes, 0 autofilters
- 0 total / streak / average rows; every sheet is a single flat table with one header row
- 0 cell fills or font colours — the entire workbook is unstyled black-on-white

So the user has **zero analytics today**. They collect the raw ticks and eyeball them. Every trend line,
streak, rolling average, and correlation the dashboard shows will be information they have literally never
had, which is the whole value proposition of the app.

## Data quality issues, consolidated

1. **Year is not in the sheet name** for the 2024 block; must be inferred from weekday text.
2. **Dates are free text**, with four distinct malformations (missing weekday, missing paren, lowercase,
   misspelled).
3. **Header drift across three eras** — same concept under different names (`Healthy Food`/`Diet`,
   `Brush+Braces`/`Brush`), and column positions move. Key on header text.
4. **Mixed encodings for the same boolean**: `✓`/`x` mostly, `1`/`0` for four days.
5. **Misspelling `Tenis`** outnumbers the correct `Tennis` 25 to 5 — normalise on import.
6. **Category leakage**: `Tenis` written in the `Gym` column once (21 Nov 2024); `1/2` in `Running` twice.
7. **Overloaded columns**: `Running` simultaneously encodes a boolean and a free-text activity name;
   `Night Clean` encodes a boolean plus the alternative `Bath`.
8. **`Multivitamin` missing for June 2024** (30 days) because the column did not exist yet — genuinely
   absent, not a blank.
9. **`Meds?` (2025) is a phantom column** — renamed over `Brush+Braces` in templates that were never filled.
10. **13 of 20 sheets are empty templates** (413 of 595 date rows), and `Sep 26` holds one lone value.
11. **`May 25` has a blank A1 header.**
12. Nine `1/2` cells carry a spurious `d-mmm` number format; the underlying value is intact text.
13. Sheets padded to ~1000 rows / 26 columns with empty cells — naive `pandas.read_excel` produces
    hundreds of all-`NaN` rows.
