# NVIDIA NIM

Personal dashboard uses NVIDIA NIM at `https://integrate.api.nvidia.com/v1`.

## Env

```bash
NVIDIA_API_KEY=nvapi-...
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_VISION_MODEL=meta/llama-3.2-11b-vision-instruct
```

Stored in `dashboard/.env.local` (gitignored). Never commit the key. If the key was pasted into chat, rotate it on build.nvidia.com.

## Transport note

Next.js Turbopack’s bundled `fetch` / `node:https` hung (~90s) talking to NVIDIA. The client shells out to system `curl` instead (`src/lib/nim/client.ts`), which returns in ~1–3s.

Workout shorthand (`bench 3x10 @50kg`) is parsed locally and never calls the model.

## Flows

1. **Nutrition → Snap a meal** — FormData photo → review → save
2. **Workouts → Type it** — shorthand local / natural language via NIM → save
3. **Workouts → Snap machine** — FormData photo → match library → save

`GET /api/health` → `{ ok, nimConfigured }` (boolean only).
`POST /api/health` → latency ping.
