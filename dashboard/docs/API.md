# Phone sync API

The iPhone app talks to the same Postgres as the website. Every route below
needs a signed-in cookie **or** a bearer token.

## Auth header

```
Authorization: Bearer <token>
```

Set `AUTH_API_TOKEN` in `dashboard/.env.local` and send that value.

With `AUTH_DEV_LOGIN=1` (local only), `AUTH_SECRET` is also accepted as the
bearer token so you can try the APIs before adding a dedicated token.

Cookie sessions from **Continue as Krish (local)** or Google/Apple work the
same — the phone can store the session cookie if it signs in through `/sign-in`.

Bearer tokens act as the imported-data user
(`00000000-0000-4000-8000-000000000001`).

`GET /api/health` stays public (liveness / NIM check). It is not a weight API.

## Routes

| Method | Path | Body / query |
| --- | --- | --- |
| `GET` | `/api/sync/snapshot` | Full dump: questions, responses, workouts (exercises + sets), meals, `food_entries`, `health_metrics`, exercises catalog summary |
| `POST` | `/api/workouts/save` | `{ name?, date?, notes?, source?, exercises: [{ name, exerciseId?, notes?, sets: [{ reps, weightKg, durationSeconds, isWarmup, rpe }] }] }` |
| `PATCH` | `/api/workouts/:id` | `{ name?, date?, notes?, durationMinutes? }` |
| `DELETE` | `/api/workouts/:id` | — |
| `POST` or `PATCH` | `/api/habits/responses` | `{ date?, key, tick: "yes" \| "partial" \| "no", note? }` — upsert by day + habit key |
| `POST` | `/api/nutrition/analyze-photo` | Multipart field `image` (JPEG/PNG/WebP, ≤8MB) + optional `hint`, **or** JSON `{ imageBase64, mimeType?, hint? }`. Returns `{ draft }` with `mealName`, `mealType`, `foods[]` (calories / proteinG / carbsG / fatG). |
| `POST` | `/api/nutrition/save-meal` | `{ date?, mealName?, mealType?, notes?, foods: [{ name, quantity?, unit?, calories?, proteinG?, carbsG?, fatG? }] }` → `{ mealId, date }` |
| `POST` | `/api/workouts/analyze-photo` | Same body as nutrition analyze-photo. Returns `{ draft }` with `name`, `date`, `exercises[]` (`exerciseId` / `matchedName` when the library hits). |
| `POST` | `/api/health/metrics` | `{ date?, kg }` or `{ date?, metric?, value }` — upsert weight (`weight_kg` / `manual`) |
| `GET` | `/api/exercises?q=` | Library search (876 rows). Returns up to 40 `{ id, name, bodyPart, equipment, target, level }` |

Dates are `YYYY-MM-DD`. All writes are scoped to the authenticated user.

Photo analyze routes need a cookie session (website) or the same bearer token as sync. iOS should send `Authorization: Bearer`, `X-Log-Token`, and `X-Log-Dev: 1`, with multipart field name `image` and a 60s client timeout. HEIC is rejected. Failed vision calls return a plain `{ error }` such as `Couldn't read that photo.` — never provider or model names.

Vision (NVIDIA NIM) runs on the Mac; the phone never sees `NVIDIA_API_KEY`. Set that key in `dashboard/.env.local`. Phone bearer: `AUTH_API_TOKEN`, or `AUTH_SECRET` when `AUTH_DEV_LOGIN=1`.

## Local check

```bash
TOKEN="$AUTH_API_TOKEN"   # or AUTH_SECRET when AUTH_DEV_LOGIN=1
curl -sS -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/sync/snapshot | python3 -c \
  'import json,sys; d=json.load(sys.stdin); print(len(d["workouts"]), len(d["responses"]), len(d["health_metrics"]))'
```
