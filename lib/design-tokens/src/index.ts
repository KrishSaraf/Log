/** Design token names for programmatic use (web / future native). */
export const tokens = {
  bg: "--kw-bg",
  bgElevated: "--kw-bg-elevated",
  surface: "--kw-surface",
  surfaceHover: "--kw-surface-hover",
  ink: "--kw-ink",
  inkMuted: "--kw-ink-muted",
  inkFaint: "--kw-ink-faint",
  border: "--kw-border",
  accent: "--kw-accent",
  accentHover: "--kw-accent-hover",
  accentMuted: "--kw-accent-muted",
  accentInk: "--kw-accent-ink",
  danger: "--kw-danger",
  success: "--kw-success",
  warning: "--kw-warning",
  fontDisplay: "--kw-font-display",
  fontBody: "--kw-font-body",
  duration: "--kw-duration",
  ease: "--kw-ease",
  tap: "--kw-tap",
} as const;

/** Literal brand values — keep in sync with tokens.css / dashboard / iOS. */
export const brand = {
  charcoal: "#0A0A0B",
  surface: "#101012",
  card: "#141416",
  lime: "#C6F135",
  onLime: "#0A0C08",
  ink: "#EDEDEF",
} as const;

export type TokenName = (typeof tokens)[keyof typeof tokens];
