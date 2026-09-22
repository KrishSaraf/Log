# Log — Mobile (Expo)

Cross-platform iOS + Android client for Log. Charcoal + electric lime, aligned with the dashboard Today hub and iOS. Consumes `@workspace/api-server` via `@workspace/api-client-react`.

## Screens

- **Today** — greeting, animated activity + nutrition rings, quick log
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

## Brand tokens (aligned with web + iOS)

| Token | Value |
|-------|-------|
| background | `#0A0A0B` |
| card | `#141416` |
| primary / accent | `#C6F135` (electric lime) |
| on primary | `#0A0C08` |
| muted foreground | `#9A9AA3` |
| move / exercise / stand | `#C6F135` / `#8FD14F` / `#6EC8E0` |
| display | Outfit |
| body | Inter |

Source of truth for mobile: `src/theme/tokens.ts`. See also `DESIGN_TOKENS.md`.

## Data

- **Exercises** — live `GET /api/exercises*` from api-server / Postgres
- **Workouts** — on-device store for now; hub sync lands with auth
- **Today rings** — soft demo progress until HealthKit / hub sync wires in
