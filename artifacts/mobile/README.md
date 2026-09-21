# Krish Workout — Mobile (Expo)

Cross-platform iOS + Android client for Krish Workout. Shares design tokens with `artifacts/lyfta-exercises` and consumes `@workspace/api-server` via `@workspace/api-client-react`.

## Screens

- **Library** — search, muscle/equipment filters, animated demo frames
- **Exercise detail** — instructions + start/add to workout
- **Active workout** — huge kg/reps inputs, one-tap complete set, auto rest timer, last-session prefills
- **Workout tab** — start/resume + on-device history
- **Settings** — rest timer, API base URL, brand token reference

## Setup

From the repo root (pnpm workspace — `artifacts/*` is already included):

```bash
pnpm install
pnpm --filter @workspace/api-server run dev   # API on :3000 (needs DATABASE_URL)
pnpm --filter @workspace/mobile start         # Expo dev server
```

Then press `i` (iOS Simulator on macOS), `a` (Android emulator), or scan the QR with Expo Go.

### API URL

| Environment | Default |
|-------------|---------|
| iOS Simulator / web | `http://localhost:3000` |
| Android emulator | `http://10.0.2.2:3000` |
| Physical device | set `EXPO_PUBLIC_API_URL=http://<your-lan-ip>:3000` or use Settings |

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.10:3000 pnpm --filter @workspace/mobile start
```

### Typecheck

```bash
pnpm --filter @workspace/mobile run typecheck
```

## Brand tokens (aligned with web)

| Token | Value |
|-------|-------|
| background | `#0A0A0A` (HSL 0 0% 4%) |
| card | `#141414` (HSL 0 0% 8%) |
| primary / accent | `#FF591A` (HSL 15 100% 55%) |
| muted foreground | `#999999` |
| border | `#262626` |
| radius | `12` (0.75rem) |
| display | Outfit |
| body | Inter |

Source of truth for mobile: `src/theme/tokens.ts`. Web: `artifacts/lyfta-exercises/src/index.css`.

## Data

- **Exercises** — live `GET /api/exercises*` from api-server / Postgres
- **Workouts** — on-device AsyncStorage (history + last-set prefills). Server sync TBD (`POST /api/workouts`)
- **Auth** — not wired; Dashboard Auth.js / HealthKit remain on the legacy Swift app until a sync API exists

## Legacy Swift

Native UI under `ios/Log` is **deprecated** in favor of this Expo app for new gym-logging work. See `ios/README.md`.
