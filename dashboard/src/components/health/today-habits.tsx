"use client";

import {
  CheckIcon,
  CircleNotchIcon,
  ListChecksIcon,
  MinusIcon,
  SparkleIcon,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { isFilledTick } from "@/lib/habit-chain";
import { habitColor } from "@/lib/habit-color";
import type { Tick } from "@/lib/habits";
import type { TodayHabitRow } from "@/lib/today";
import { cn } from "@/lib/utils";

export type { TodayHabitRow };

async function saveTick(key: string, date: string, tick: Tick | null) {
  const res = await fetch("/api/habits/responses", {
    method: tick ? "POST" : "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tick ? { key, date, tick } : { key, date }),
  });
  if (!res.ok) throw new Error("Could not save");
}

/**
 * Alive Today habits strip — coloured ticks, mini week heat, one-tap demo seed.
 */
export function TodayHabits({
  date,
  habits,
}: {
  date: string;
  habits: TodayHabitRow[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(habits);
  const [pending, setPending] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedNote, setSeedNote] = useState<string | null>(null);

  useEffect(() => {
    setRows(habits);
  }, [habits]);

  const done = rows.filter((h) => isFilledTick(h.tick)).length;
  const total = rows.length;
  const progress = total > 0 ? done / total : 0;

  async function toggle(key: string) {
    const row = rows.find((h) => h.key === key);
    if (!row) return;
    const next: Tick | null = isFilledTick(row.tick) ? null : "yes";
    setPending(key);
    setRows((prev) =>
      prev.map((h) =>
        h.key === key
          ? {
              ...h,
              tick: next,
              week: [...h.week.slice(0, -1), next],
              streak:
                next && isFilledTick(next)
                  ? Math.max(1, h.streak + (isFilledTick(h.tick) ? 0 : 1))
                  : 0,
            }
          : h,
      ),
    );
    try {
      await saveTick(key, date, next);
      router.refresh();
    } catch {
      setRows(habits);
    } finally {
      setPending(null);
    }
  }

  async function seedDemo() {
    setSeeding(true);
    setSeedNote(null);
    try {
      const res = await fetch("/api/habits/seed-demo", { method: "POST" });
      const body = (await res.json().catch(() => null)) as {
        error?: string;
        inserted?: number;
      } | null;
      if (!res.ok) throw new Error(body?.error || "Could not seed habits.");
      setSeedNote(
        body?.inserted
          ? `Loaded ${body.inserted} demo ticks — chains are live.`
          : "Habits ready.",
      );
      router.refresh();
    } catch (err) {
      setSeedNote(err instanceof Error ? err.message : "Seed failed.");
    } finally {
      setSeeding(false);
    }
  }

  if (total === 0) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-relaxed text-text-muted">
            No habits yet — seed the default set with a lived-in week so Today
            feels awake.
          </p>
          <button
            type="button"
            disabled={seeding}
            onClick={() => void seedDemo()}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-lime px-4 text-sm font-medium text-on-lime transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {seeding ? (
              <CircleNotchIcon size={16} className="animate-spin" aria-hidden />
            ) : (
              <SparkleIcon size={16} weight="fill" aria-hidden />
            )}
            {seeding ? "Seeding…" : "Seed demo habits"}
          </button>
        </div>
        {seedNote ? (
          <p className="text-xs text-text-muted">{seedNote}</p>
        ) : null}
      </div>
    );
  }

  const allEmpty = rows.every((h) => h.week.every((t) => t == null));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="num text-2xl font-medium tracking-tight text-text">
            {done}
            <span className="text-text-faint">/{total}</span>
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            {done === 0
              ? "Nothing marked yet — tap a habit"
              : done === total
                ? "All checked for today"
                : `${total - done} still open`}
          </p>
        </div>
        <div
          className="h-1.5 w-28 overflow-hidden rounded-full bg-surface-sunken"
          role="progressbar"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Habits done today"
        >
          <div
            className="h-full rounded-full bg-lime transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>

      {allEmpty ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-lime-line/50 bg-lime-quiet/20 px-3 py-2.5">
          <ListChecksIcon size={16} className="text-lime" aria-hidden />
          <p className="min-w-0 flex-1 text-xs text-text-muted">
            Chains are empty — load a demo week to see heat.
          </p>
          <button
            type="button"
            disabled={seeding}
            onClick={() => void seedDemo()}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-lime-line px-3 text-xs font-medium text-lime hover:bg-lime-quiet disabled:opacity-60"
          >
            {seeding ? (
              <CircleNotchIcon size={14} className="animate-spin" aria-hidden />
            ) : (
              <SparkleIcon size={14} weight="fill" aria-hidden />
            )}
            Fill demo week
          </button>
        </div>
      ) : null}

      <ul className="divide-y divide-line rounded-xl border border-line bg-surface-sunken/30">
        {rows.map((habit, index) => {
          const color = habitColor(habit.key);
          const doneToday = isFilledTick(habit.tick);
          const half = habit.tick === "partial";
          const busy = pending === habit.key;
          return (
            <li
              key={habit.key}
              className="flex items-center gap-3 px-3 py-2.5 animate-[reveal-up_320ms_var(--ease-out-quint)_both]"
              style={{ animationDelay: `${index * 35}ms` }}
            >
              <button
                type="button"
                disabled={busy}
                onClick={() => void toggle(habit.key)}
                aria-pressed={doneToday}
                aria-label={
                  doneToday
                    ? `${habit.label}, done. Tap to clear.`
                    : `${habit.label}, not logged. Tap to mark done.`
                }
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-full transition-transform",
                  "hover:scale-[0.96] active:scale-[0.9] disabled:opacity-50",
                )}
              >
                <span
                  className="flex size-8 items-center justify-center rounded-full transition-[background-color,box-shadow] duration-200"
                  style={
                    doneToday
                      ? { background: color, color: "#0A0A0B" }
                      : {
                          boxShadow: `inset 0 0 0 1.5px color-mix(in oklab, ${color} 55%, transparent)`,
                        }
                  }
                  aria-hidden
                >
                  {busy ? (
                    <CircleNotchIcon size={14} className="animate-spin" />
                  ) : doneToday ? (
                    half ? (
                      <MinusIcon size={14} weight="bold" />
                    ) : (
                      <CheckIcon size={14} weight="bold" />
                    )
                  ) : null}
                </span>
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <p className="truncate text-sm font-medium text-text">
                    {habit.label}
                  </p>
                  {habit.streak >= 2 ? (
                    <span
                      className="num shrink-0 text-[10px] font-medium"
                      style={{ color }}
                    >
                      {habit.streak}d
                    </span>
                  ) : null}
                </div>
                <div
                  className="mt-1.5 flex gap-1"
                  role="img"
                  aria-label={`${habit.label} last 7 days`}
                >
                  {habit.week.map((tick, i) => {
                    const filled = isFilledTick(tick);
                    const isToday = i === habit.week.length - 1;
                    return (
                      <span
                        key={`${habit.key}-w${i}`}
                        className="h-1.5 flex-1 rounded-full"
                        style={{
                          background: filled ? color : "var(--surface-raised)",
                          opacity: tick === "partial" ? 0.45 : 1,
                          boxShadow:
                            isToday && !filled
                              ? `inset 0 0 0 1px ${color}`
                              : undefined,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {seedNote ? (
        <p className="text-xs text-text-muted animate-[reveal-up_240ms_var(--ease-out-quint)_both]">
          {seedNote}
        </p>
      ) : null}
    </div>
  );
}
