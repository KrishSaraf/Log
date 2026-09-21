/**
 * Shared visual language with artifacts/lyfta-exercises (index.css).
 * Web HSL tokens → mobile hex so both products feel like one brand.
 *
 * | Token              | Web (HSL)        | Mobile            |
 * |--------------------|------------------|-------------------|
 * | background         | 0 0% 4%          | #0A0A0A           |
 * | foreground         | 0 0% 98%         | #FAFAFA           |
 * | card               | 0 0% 8%          | #141414           |
 * | primary / accent   | 15 100% 55%      | #FF591A           |
 * | muted              | 0 0% 12%         | #1F1F1F           |
 * | muted-foreground   | 0 0% 60%         | #999999           |
 * | border             | 0 0% 15%         | #262626           |
 * | secondary          | 0 0% 15%         | #262626           |
 * | radius             | 0.75rem          | 12                |
 * | display font       | Outfit           | Outfit            |
 * | body font          | Inter            | Inter             |
 */

export const colors = {
  background: "#0A0A0A",
  foreground: "#FAFAFA",
  card: "#141414",
  cardElevated: "#1A1A1A",
  primary: "#FF591A",
  primaryMuted: "rgba(255, 89, 26, 0.18)",
  onPrimary: "#FFFFFF",
  muted: "#1F1F1F",
  mutedForeground: "#999999",
  faint: "#666666",
  border: "#262626",
  borderStrong: "rgba(255,255,255,0.14)",
  success: "#4ADE80",
  danger: "#F87171",
  ink: "#0A0A0A",
  overlay: "rgba(0,0,0,0.72)",
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  screen: 20,
} as const;

export const type = {
  display: "Outfit_700Bold",
  displaySemi: "Outfit_600SemiBold",
  displayMed: "Outfit_500Medium",
  body: "Inter_400Regular",
  bodyMed: "Inter_500Medium",
  bodySemi: "Inter_600SemiBold",
} as const;

export const motion = {
  pressScale: 0.97,
  spring: { damping: 22, stiffness: 280 },
  restSecondsDefault: 90,
} as const;
