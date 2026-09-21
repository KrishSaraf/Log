/**
 * Shared Log brand — charcoal + electric lime (aligned with dashboard + iOS).
 *
 * | Token       | Value     |
 * |-------------|-----------|
 * | background  | #0A0A0B   |
 * | surface     | #141416   |
 * | primary     | #C6F135   |
 * | onPrimary   | #0A0C08   |
 */

export const colors = {
  background: "#0A0A0B",
  foreground: "#EDEDEF",
  card: "#141416",
  cardElevated: "#1A1A1E",
  primary: "#C6F135",
  primaryMuted: "rgba(198, 241, 53, 0.14)",
  onPrimary: "#0A0C08",
  muted: "#1A1A1E",
  mutedForeground: "#9A9AA3",
  faint: "#65656E",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.14)",
  success: "#3DD68C",
  danger: "#FF5C5C",
  move: "#C6F135",
  exercise: "#8FD14F",
  stand: "#6EC8E0",
  ink: "#0A0A0B",
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

/** Soft daily goals for Today rings (display only). */
export const goals = {
  moveKcal: 500,
  exerciseMin: 30,
  standHr: 12,
  calories: 2200,
  proteinG: 140,
} as const;
