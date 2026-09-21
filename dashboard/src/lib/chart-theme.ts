/**
 * Chart palette and axis defaults.
 *
 * Recharts writes most colours straight onto SVG presentation attributes, so
 * these are literal values rather than `var(--chart-1)` references. They mirror
 * the tokens in globals.css: if you change one, change both.
 */
export const CHART_COLORS = {
  lime: "#c6ff00",
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

/** Spread onto `<CartesianGrid />`. Horizontal rules only, no vertical noise. */
export const gridProps = {
  stroke: CHART_INK.grid,
  strokeDasharray: "0",
  vertical: false,
} as const;

/** Spread onto `<XAxis />` and `<YAxis />`. */
export const axisProps = {
  stroke: CHART_INK.axis,
  tickLine: false,
  axisLine: false,
  tick: {
    fill: CHART_INK.tick,
    fontSize: 11,
    fontFamily: "var(--font-mono)",
  },
  tickMargin: 8,
} as const;

/** Spread onto `<Tooltip />` for a surface that matches Panel. */
export const tooltipProps = {
  cursor: { fill: CHART_INK.cursor, stroke: "transparent" },
  contentStyle: {
    background: "#17171a",
    border: "1px solid rgba(255,255,255,0.13)",
    borderRadius: "0.5rem",
    padding: "8px 10px",
    fontSize: 12,
    boxShadow: "none",
  },
  labelStyle: { color: "#9a9aa3", marginBottom: 4, fontSize: 11 },
  itemStyle: { color: "#ededef", fontFamily: "var(--font-mono)" },
} as const;

/** Standard chart heights so panels line up across pages. */
export const CHART_HEIGHT = {
  sparkline: 36,
  compact: 140,
  default: 220,
  tall: 320,
} as const;
