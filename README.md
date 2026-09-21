# Log

All-in-one health platform — activity, workouts, vitals, sleep, nutrition,
trends, and connections (HealthKit / Health Connect / Google Fit).

The exercise library is one module, not the whole product.

## Apps

- **dashboard/** — Next.js health home (Today, nutrition, metrics, connections)
- **ios/Log** — SwiftUI + HealthKit (pushes day samples into the hub)
- **artifacts/lyfta-exercises** — Exercise library web module
- **artifacts/api-server** — Express API for the exercise catalogue
- **lib/design-tokens** — Shared charcoal + electric lime tokens

## Brand

Charcoal surfaces + electric lime `#C6F135`. Syne (display) + Manrope (body).

## Dev

```bash
cd dashboard && npm install && npm run dev   # http://localhost:3001
```

See `dashboard/docs/HEALTH_PLATFORM.md` for the data model and log surfaces.
