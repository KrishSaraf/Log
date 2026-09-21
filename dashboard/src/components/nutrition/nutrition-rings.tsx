"use client";

/**
 * Dual progress for calories + protein against soft daily goals.
 * Complements activity rings without inventing a new nutrition schema.
 */
export function NutritionRings({
  calories,
  protein,
  size = 120,
}: {
  calories: number;
  protein: number;
  size?: number;
}) {
  const line = Math.max(8, size * 0.14);
  const gap = Math.max(3, size * 0.045);
  const inset = line / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden
      className="shrink-0"
    >
      {ring({
        progress: calories,
        color: "var(--color-lime)",
        track: "var(--color-lime-quiet)",
        line,
        padding: inset,
        size,
      })}
      {ring({
        progress: protein,
        color: "#8fd14f",
        track: "oklch(0.75 0.12 140 / 18%)",
        line,
        padding: inset + line + gap,
        size,
      })}
    </svg>
  );
}

function ring({
  progress,
  color,
  track,
  line,
  padding,
  size,
}: {
  progress: number;
  color: string;
  track: string;
  line: number;
  padding: number;
  size: number;
}) {
  const clamped = Math.min(1, Math.max(0, progress));
  const r = (size - padding * 2 - line) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <g key={`${color}-${padding}`}>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={track}
        strokeWidth={line}
      />
      {clamped > 0 ? (
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={line}
          strokeLinecap="round"
          strokeDasharray={`${c * clamped} ${c}`}
          transform={`rotate(-90 ${cx} ${cy})`}
          className="transition-[stroke-dasharray] duration-700 ease-out"
        />
      ) : null}
    </g>
  );
}
