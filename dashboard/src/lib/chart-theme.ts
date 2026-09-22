/**
 * Chart palette and axis defaults for pure SVG charts.
 *
 * Literal hex values (not CSS vars) so SVG presentation attributes stay
 * deterministic. Mirror tokens in globals.css: if you change one, change both.
 */
export const CHART_COLORS = {
  lime: "#C6F135",
  leaf: "#8fd14f",
  mist: "#a8b3a0",
  steel: "#6e8091",
  ash: "#4a4a52",
} as const;

/** Ordered series ramp. Index 0 is the metric the page is actually about. */
export const CHART_SERIES = [
  CHART_COLORS.lime,
  CHART_COLORS.leaf,
  CHART_COLORS.mist,
  CHART_COLORS.steel,
  CHART_COLORS.ash,
] as const;

export const CHART_SIGNAL = {
  positive: "#5fbf8c",
  negative: "#e2564b",
} as const;

export const CHART_INK = {
  grid: "rgba(255,255,255,0.06)",
  axis: "rgba(255,255,255,0.10)",
  tick: "#65656e",
  cursor: "rgba(255,255,255,0.06)",
} as const;

/** Standard chart heights so panels line up across pages. */
export const CHART_HEIGHT = {
  sparkline: 36,
  compact: 140,
  default: 220,
  tall: 320,
} as const;
