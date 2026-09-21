"use client";

import * as React from "react";

import { CHART_COLORS, CHART_HEIGHT, CHART_INK } from "@/lib/chart-theme";
import { formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export type SimplePoint = {
  date: string;
  value: number;
};

type HoverState = {
  index: number;
  x: number;
  y: number;
} | null;

/**
 * Pure SVG line chart — no Recharts, no ResponsiveContainer blank frames.
 * Matches the charcoal + lime hub look with a soft area wash.
 */
export function SimpleLineChart({
  points,
  height = CHART_HEIGHT.default,
  formatValue = (n) => String(n),
  label = "Value",
  unit,
  className,
  stroke = CHART_COLORS.lime,
}: {
  points: SimplePoint[];
  height?: number;
  formatValue?: (n: number) => string;
  label?: string;
  unit?: string;
  className?: string;
  stroke?: string;
}) {
  const [hover, setHover] = React.useState<HoverState>(null);
  const gradId = React.useId().replace(/:/g, "");
  const pad = { top: 16, right: 12, bottom: 28, left: 40 };
  const width = 560;
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const yPad = span === 0 ? Math.max(1, Math.abs(max) * 0.05 || 1) : span * 0.14;
  const yMin = min - yPad;
  const yMax = max + yPad;

  const xAt = (i: number) =>
    pad.left + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const yAt = (v: number) =>
    pad.top + innerH - ((v - yMin) / (yMax - yMin || 1)) * innerH;

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(2)},${yAt(p.value).toFixed(2)}`)
    .join(" ");

  const areaPath =
    points.length > 0
      ? `${linePath} L${xAt(points.length - 1).toFixed(2)},${(pad.top + innerH).toFixed(2)} L${xAt(0).toFixed(2)},${(pad.top + innerH).toFixed(2)} Z`
      : "";

  const yTicks = [yMin, (yMin + yMax) / 2, yMax];
  const xLabelEvery = Math.max(1, Math.ceil(points.length / 5));

  return (
    <div className={cn("relative min-w-0", className)} style={{ height }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="100%"
        preserveAspectRatio="none"
        className="overflow-visible"
        role="img"
        aria-label={`${label} trend`}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={`lineWash-${gradId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>

        {yTicks.map((tick, i) => {
          const y = yAt(tick);
          return (
            <g key={`y-${i}`}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={y}
                y2={y}
                stroke={CHART_INK.grid}
                strokeWidth={1}
              />
              <text
                x={pad.left - 8}
                y={y + 3}
                textAnchor="end"
                fill={CHART_INK.tick}
                fontSize={10}
                fontFamily="var(--font-mono)"
              >
                {formatValue(tick)}
              </text>
            </g>
          );
        })}

        {points.map((p, i) =>
          i % xLabelEvery === 0 || i === points.length - 1 ? (
            <text
              key={`x-${p.date}`}
              x={xAt(i)}
              y={height - 8}
              textAnchor="middle"
              fill={CHART_INK.tick}
              fontSize={10}
              fontFamily="var(--font-mono)"
            >
              {formatShortDate(p.date)}
            </text>
          ) : null,
        )}

        {areaPath ? <path d={areaPath} fill={`url(#lineWash-${gradId})`} /> : null}
        {linePath ? (
          <path
            d={linePath}
            fill="none"
            stroke={stroke}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}

        {points.map((p, i) => (
          <circle
            key={`hit-${p.date}`}
            cx={xAt(i)}
            cy={yAt(p.value)}
            r={10}
            fill="transparent"
            className="cursor-crosshair"
            onMouseEnter={() =>
              setHover({ index: i, x: xAt(i), y: yAt(p.value) })
            }
          />
        ))}

        {hover ? (
          <g>
            <line
              x1={hover.x}
              x2={hover.x}
              y1={pad.top}
              y2={pad.top + innerH}
              stroke={CHART_INK.cursor}
              strokeWidth={1}
            />
            <circle
              cx={hover.x}
              cy={hover.y}
              r={3.5}
              fill={stroke}
              stroke="#0A0A0B"
              strokeWidth={1.5}
            />
          </g>
        ) : null}
      </svg>

      {hover && points[hover.index] ? (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-line bg-surface-raised px-2.5 py-1.5 text-xs shadow-none"
          style={{
            left: `min(max(${(hover.x / width) * 100}% - 48px, 4px), calc(100% - 120px))`,
            top: 4,
          }}
        >
          <p className="text-text-faint">{formatShortDate(points[hover.index].date)}</p>
          <p className="num text-text">
            {formatValue(points[hover.index].value)}
            {unit ? ` ${unit}` : ""}
            <span className="ml-1 text-text-muted">{label}</span>
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** Compact SVG sparkline for MetricCard slots — always paints. */
export function SimpleSparkline({
  values,
  height = CHART_HEIGHT.sparkline,
  stroke = CHART_COLORS.lime,
  className,
}: {
  values: number[];
  height?: number;
  stroke?: string;
  className?: string;
}) {
  if (values.length < 2) {
    return (
      <div
        className={cn("rounded-md bg-surface-sunken/80", className)}
        style={{ height }}
        aria-hidden
      />
    );
  }

  const width = 120;
  const padY = 4;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = padY + (height - padY * 2) * (1 - (v - min) / span);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      className={cn("overflow-visible", className)}
      aria-hidden
    >
      <polyline
        points={pts}
        fill="none"
        stroke={stroke}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export type SimpleBarPoint = {
  date: string;
  value: number;
  /** Optional fill override (e.g. quality tint). */
  fill?: string;
};

/**
 * Soft SVG bar chart — used for sleep nights. Average line optional.
 */
export function SimpleBarChart({
  points,
  height = CHART_HEIGHT.default,
  formatValue = (n) => String(n),
  label = "Value",
  unit,
  average,
  className,
  defaultFill = CHART_COLORS.lime,
}: {
  points: SimpleBarPoint[];
  height?: number;
  formatValue?: (n: number) => string;
  label?: string;
  unit?: string;
  average?: number | null;
  className?: string;
  defaultFill?: string;
}) {
  const [hover, setHover] = React.useState<number | null>(null);
  const gradId = React.useId().replace(/:/g, "");
  const pad = { top: 14, right: 10, bottom: 28, left: 36 };
  const width = 560;
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const maxVal = Math.max(...points.map((p) => p.value), average ?? 0, 1);
  const yMax = maxVal * 1.12;
  const gap = 0.32;
  const slot = innerW / Math.max(points.length, 1);
  const barW = Math.min(28, slot * (1 - gap));

  const yAt = (v: number) => pad.top + innerH - (v / yMax) * innerH;
  const xAt = (i: number) => pad.left + slot * i + (slot - barW) / 2;

  const xLabelEvery = Math.max(1, Math.ceil(points.length / 6));
  const yTicks = [0, yMax / 2, yMax];

  return (
    <div className={cn("relative min-w-0", className)} style={{ height }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="100%"
        preserveAspectRatio="none"
        role="img"
        aria-label={`${label} bars`}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={`barGlow-${gradId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.lime} stopOpacity={0.95} />
            <stop offset="100%" stopColor={CHART_COLORS.lime} stopOpacity={0.5} />
          </linearGradient>
        </defs>

        {yTicks.map((tick, i) => {
          const y = yAt(tick);
          return (
            <g key={`grid-${i}`}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={y}
                y2={y}
                stroke={CHART_INK.grid}
              />
              <text
                x={pad.left - 8}
                y={y + 3}
                textAnchor="end"
                fill={CHART_INK.tick}
                fontSize={10}
                fontFamily="var(--font-mono)"
              >
                {formatValue(tick)}
              </text>
            </g>
          );
        })}

        {average != null && average > 0 ? (
          <line
            x1={pad.left}
            x2={width - pad.right}
            y1={yAt(average)}
            y2={yAt(average)}
            stroke={CHART_COLORS.mist}
            strokeDasharray="4 4"
            strokeOpacity={0.75}
            vectorEffect="non-scaling-stroke"
          />
        ) : null}

        {points.map((p, i) => {
          const x = xAt(i);
          const y = yAt(p.value);
          const h = Math.max(2, pad.top + innerH - y);
          const active = hover === i;
          return (
            <g key={p.date}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={5}
                ry={5}
                fill={p.fill ?? `url(#barGlow-${gradId})`}
                opacity={active ? 1 : 0.92}
                className="transition-opacity duration-150"
                onMouseEnter={() => setHover(i)}
              />
              {i % xLabelEvery === 0 || i === points.length - 1 ? (
                <text
                  x={x + barW / 2}
                  y={height - 8}
                  textAnchor="middle"
                  fill={CHART_INK.tick}
                  fontSize={10}
                  fontFamily="var(--font-mono)"
                >
                  {formatShortDate(p.date)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      {hover != null && points[hover] ? (
        <div
          className="pointer-events-none absolute top-1 left-1/2 z-10 -translate-x-1/2 rounded-lg border border-line bg-surface-raised px-2.5 py-1.5 text-xs"
        >
          <p className="text-text-faint">{formatShortDate(points[hover].date)}</p>
          <p className="num text-text">
            {formatValue(points[hover].value)}
            {unit ? ` ${unit}` : ""}
            <span className="ml-1 text-text-muted">{label}</span>
          </p>
        </div>
      ) : null}
    </div>
  );
}
