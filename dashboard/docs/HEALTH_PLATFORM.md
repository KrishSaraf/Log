# Health platform architecture (wave 1+)

Log is an **all-in-one health home**, not a gym-only logger. Exercise library is one module.

## Surfaces

| Surface | Role |
|---|---|
| **Today** (`/`) | Rings + vitals summary, **Quick Log**, recent activity, shortcuts |
| **Workouts** | Sessions + **Exercise library** tab |
| **Nutrition** | Meals / macros |
| **Health** | Trends (weight, sleep, water, HR, mood) + Quick Log |
| **Habits** (`/log`) | Daily tick grid |
| **Connections** | HealthKit / Health Connect / Google Fit |

## Manual logging (DB → API → UI)

| Type | Storage | Write API | UI |
|---|---|---|---|
| Weight | `health_metrics` (`weight_kg`) | `POST /api/health/metrics` | Today/Health Quick Log, iOS `LogWeightSheet` |
| Sleep | `sleep_sessions` + mirrored `sleep_minutes` | `POST /api/health/sleep` | Quick Log, iOS `LogSleepSheet` |
| Water | `health_metrics` (`water_ml`) | `POST /api/health/metrics` | Quick Log, iOS `LogWaterSheet` |
| HR / BP | `heart_rate_resting`, `blood_pressure_*` | `POST /api/health/metrics` (`entries`) | Quick Log, iOS `LogVitalsSheet` |
| Mood / energy | `mood`, `energy` (1–5) | same | Quick Log, iOS vitals sheet |
| Meals | `meals` / `food_entries` (existing) | `POST /api/nutrition/save-meal` (photo + manual) | `/nutrition`, Today hub, iOS Food |
| Workouts | `workouts`… | existing workout routes | Workouts + library |

### Nutrition source of truth

Dashboard `hub.meals` + `hub.food_entries` — photo logger, manual logger, and iOS
`MealLog` sync all write the same shape. Today surfaces calories/protein rings
and recent meals via `loadNutritionSummary()` (shared with `/nutrition`).

## Connections

- **Apple Health / HealthKit** — real auth + read hooks on iOS
- **Health Connect / Google Fit** — catalog + DB status placeholders until Android
- Web `/settings/connections` persists status via `POST /api/settings/connections`

## Brand

Charcoal surfaces + electric lime `#c6ff00` (web `--lime*`, iOS `Palette.accent`).
