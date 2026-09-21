# Design tokens — Krish Workout (mobile ↔ web)

Documented so Expo and `lyfta-exercises` stay one brand. Do not invent a second palette.

## Color

| Role | Web CSS var | HSL | Hex (mobile) |
|------|-------------|-----|--------------|
| Background | `--background` | `0 0% 4%` | `#0A0A0A` |
| Foreground | `--foreground` | `0 0% 98%` | `#FAFAFA` |
| Card | `--card` | `0 0% 8%` | `#141414` |
| Primary / accent | `--primary` | `15 100% 55%` | `#FF591A` |
| Muted | `--muted` | `0 0% 12%` | `#1F1F1F` |
| Muted foreground | `--muted-foreground` | `0 0% 60%` | `#999999` |
| Border | `--border` | `0 0% 15%` | `#262626` |

One accent on charcoal/ink — no rainbow chrome.

## Radii & type

| Token | Web | Mobile |
|-------|-----|--------|
| Radius | `--radius: 0.75rem` | `12` |
| Display | Outfit | `Outfit_700Bold` / `600` / `500` |
| Body | Inter | `Inter_400/500/600` |

## Motion

- Press scale `0.97` spring (damping 22 / stiffness 280)
- List rows stagger `FadeInDown`
- Rest timer slide-up after set complete
