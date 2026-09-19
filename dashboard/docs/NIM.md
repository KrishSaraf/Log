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

Next’s bundled `fetch` / bare `curl` DNS can stall ~45–90s to `integrate.api.nvidia.com`. The client (`src/lib/nim/client.ts`) uses `/usr/bin/curl -4` with a pinned A record (`--resolve`), keeps the bearer token in a temp config file (not `ps` argv), and falls back to `https` dialing that same IPv4.

Use **`meta/llama-3.2-11b-vision-instruct`** in `.env.local`. The 90B vision model often stalls. The client reads NVIDIA_* from `.env.local` first so a shell export cannot override it.

Restart `npm run dev` after changing other Next env; model/key are re-read from `.env.local` on each request.

## Flows

1. **Nutrition → Snap a meal** — FormData photo → review → save
2. **Workouts → Type it** — shorthand local / natural language via NIM → save
3. **Workouts → Snap machine** — FormData photo → match library → save

`GET /api/health` → `{ ok, nimConfigured }` (boolean only).
`POST /api/health` → latency ping.
