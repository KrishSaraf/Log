# Design tokens — Log (mobile ↔ web ↔ iOS)

Documented so Expo, dashboard, and native stay one brand. Do not invent a second palette.

## Color

| Role | Web CSS var | Hex |
|------|-------------|-----|
| Background | `--background` / charcoal | `#0A0A0B` |
| Foreground | `--text` | `#EDEDEF` |
| Card / surface | `--surface` | `#141416` |
| Primary / accent | `--lime` | `#C6F135` |
| On primary | `--on-lime` | `#0A0C08` |
| Muted foreground | `--text-muted` | `#9A9AA3` |
| Border | `--line` | `rgba(255,255,255,0.08)` |

**Move** `#C6F135` · **Exercise** `#8FD14F` · **Stand** `#6EC8E0`

One electric lime accent on charcoal — no orange, no purple chrome.

## Radii & type

| Token | Web | Mobile |
|-------|-----|--------|
| Radius | `--radius` ~12–16px | `8 / 12 / 16 / 20` |
| Display | Syne (web) / Outfit (Expo) | `Outfit_700Bold` / `600` / `500` |
| Body | Manrope (web) / Inter (Expo) | `Inter_400/500/600` |

## Motion

- Press scale `0.97` spring (damping 22 / stiffness 280)
- Today rings: 900–1000ms ease-out on mount
- List rows: FadeInDown stagger
- Rest timer slide-up after set complete

## Soft daily goals (Today rings)

| Ring | Goal |
|------|------|
| Move | 500 kcal |
| Exercise | 30 min |
| Stand | 12 hr |
| Calories | 2200 kcal |
| Protein | 140 g |
