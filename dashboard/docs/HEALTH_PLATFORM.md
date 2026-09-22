# Health platform architecture

Log is an **all-in-one health home** (Apple Health–class), not a gym-only logger.
Exercise library is one module.

## Surfaces

| Surface | Role |
|---|---|
| **Today** (`/`) | Greeting + activity/nutrition rings, vitals, meals, shortcuts, log forms |
| **Workouts** | Sessions + **Exercise library** tab |
| **Nutrition** | Photo + manual → `meals` / `food_entries` |
| **Health** | Trends (weight, sleep, water, HR, mood) + Quick Log |
| **Habits** (`/log`) | Daily tick grid |
| **Connections** | HealthKit / Health Connect / Google Fit |

## Manual + connected logging

| Type | Storage | Write API | UI |
|---|---|---|---|
| Weight | `health_metrics.weight_kg` | `POST /api/health/metrics` | Today/Health, iOS |
| Sleep | `sleep_sessions` (+ `sleep_minutes`) | `POST /api/health/sleep` | Today/Health, iOS |
| Water / HR / BP / mood / energy | `health_metrics` | `POST /api/health/metrics` | Quick Log + iOS sheets |
| Meals | `meals` + `food_entries` | `POST /api/nutrition/save-meal` | `/nutrition`, Today, iOS Food |
| HealthKit day samples | same tables, `source=apple_health` | pushed from iOS after HK refresh | `HealthKitRemoteSync` |
| Workouts | `workouts`… | existing routes | Workouts + library |

## Connections

- **Apple Health / HealthKit** — auth + read on iOS; remote sync upserts metrics + marks `connected_sources`
- **Health Connect / Google Fit** — connection catalog + persistable status placeholders for Android
- Web `/settings/connections` → `POST /api/settings/connections`

## Brand

Charcoal + electric lime `#c6f135` (dashboard, iOS, lyfta-exercises, `lib/design-tokens`).
Syne (display) + Manrope (body) on web.
