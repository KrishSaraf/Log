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

export type TokenName = (typeof tokens)[keyof typeof tokens];
