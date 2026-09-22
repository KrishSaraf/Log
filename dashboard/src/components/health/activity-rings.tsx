"use client";

import { useEffect, useState } from "react";

/**
 * Three concentric activity rings (Move / Exercise / Stand), mirroring the
 * iOS Today strip. Progress values are 0..1; animate in on mount.
 */
export function ActivityRings({
  move,
  exercise,
  stand,
  size = 128,
}: {
  move: number;
  exercise: number;
  stand: number;
  size?: number;
}) {
  const line = Math.max(8, size * 0.125);
  const gap = Math.max(2.5, size * 0.04);
  const inset = line / 2;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden
      className="shrink-0"
    >
      {ring({
        progress: ready ? move : 0,
        color: "var(--color-lime)",
        track: "var(--color-lime-quiet)",
        line,
        padding: inset,
        size,
      })}
      {ring({
        progress: ready ? exercise : 0,
        color: "#8fd14f",
        track: "oklch(0.75 0.12 140 / 18%)",
        line,
        padding: inset + line + gap,
        size,
      })}
      {ring({
        progress: ready ? stand : 0,
        color: "#6ec8e0",
        track: "oklch(0.75 0.08 220 / 18%)",
        line,
        padding: inset + 2 * (line + gap),
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
        className="transition-[stroke-dasharray] duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ opacity: clamped > 0.001 ? 1 : 0 }}
      />
    </g>
  );
}
