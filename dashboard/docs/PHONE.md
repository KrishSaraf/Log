# Using Log on your phone

The app is a normal website you open in Safari or Chrome. AI photo/text calls stay on the laptop — the phone never sees your NVIDIA key.

## Same Wi‑Fi (dev on your Mac)

1. On the Mac, leave the dashboard running (`npm run dev` in `dashboard/` — binds `0.0.0.0:3001`).
2. Open **`http://192.168.68.64:3001`** on the phone (same Wi‑Fi). Your LAN IP may differ; check `ipconfig getifaddr en0` on the Mac.
3. If it won’t load, allow Node in macOS Firewall.
4. AI photo/text calls stay on the Mac — the phone never needs the cloud key.

## Add to Home Screen

### iPhone (Safari)

1. Open the site in **Safari** (not Chrome).
2. Tap the Share button → **Add to Home Screen**.
3. Name it **Log** → Add.
4. Open from the icon for a full-screen dark shell.

### Android (Chrome)

1. Open the site in Chrome.
2. Menu (⋮) → **Add to Home screen** / **Install app**.
3. Confirm.

A tiny service worker caches the shell (pages/icons) so the chrome still opens offline. Your habit/meal data still needs the Mac server while you are on this LAN setup.

## Camera tips

- **Nutrition** and **Workouts → Snap machine** use the camera / photo picker.
- Photos are resized on the phone before upload.
- If iOS saved a **HEIC** from the library, take a fresh camera shot or pick a JPEG — HEIC is rejected with a clear message.
- Prefer good light; the model estimates food / machines, then you confirm before saving.

## What works on phone

- Day strip + habit check-in
- Workouts: type shorthand, snap a machine, browse Library
- Nutrition: snap a meal, see recent meals
- Bottom/top safe areas for notch and home indicator

## iOS limits to know

- Background sync with Apple Health is not available from a website alone (see `INTEGRATIONS.md`).
- “Add to Home Screen” only from Safari.
- Large Live Photos / HEIC from the library may need a retake as JPEG.
