# Health platform architecture (wave 1)

Log is an **all-in-one health home**, not a gym-only logger. Exercise library is one module.

## Surfaces

| Surface | Role |
|---|---|
| **Today** (`/`) | Rings + vitals summary, recent activity, shortcuts |
| **Workouts** | Sessions + **Exercise library** tab |
| **Nutrition** | Meals / macros |
| **Health** | Trends and metric coverage |
| **Habits** (`/log`) | Daily tick grid |
| **Connections** | HealthKit / Health Connect / Google Fit |

## Data (hub schema)

- `health_metrics` — daily vitals / activity samples (existing)
- `sleep_sessions` — nightly sleep with optional stages
- `meals` / `food_entries` — nutrition (existing)
- `connected_sources` — per-user provider link state
- `workouts`… — training (existing)
- `questions` / `question_responses` — habits (existing)

## Connections

- **Apple Health / HealthKit** — real auth + read hooks on iOS
- **Health Connect / Google Fit** — catalog + DB status placeholders until Android
- Web `/settings/connections` persists status via `POST /api/settings/connections`

## Brand

Charcoal surfaces + electric lime `#c6ff00` (web tokens `--lime*`, iOS `Palette.accent`).
