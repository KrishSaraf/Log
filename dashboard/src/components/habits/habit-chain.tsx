"use client";

import { CheckIcon, MinusIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import { habitColor } from "@/lib/habit-color";
import {
  habitStreak,
  isFilledTick,
  weekColumns,
} from "@/lib/habit-chain";
import { formatDayWeekday, todayIso } from "@/lib/format";
import type { HabitQuestion, HabitRange, Tick } from "@/lib/habits";
import { cn } from "@/lib/utils";

type CellMap = Record<string, Tick | undefined>;

function overlayKey(habitKey: string, date: string) {
  return `${habitKey}|${date}`;
}

async function saveTick(key: string, date: string, tick: Tick | null) {
  const res = await fetch("/api/habits/responses", {
    method: tick ? "POST" : "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tick ? { key, date, tick } : { key, date }),
  });
  if (!res.ok) throw new Error("Could not save");
}

export function HabitChainBoard({
  questions,
  ranges,
  selected: selectedProp,
  onSelectDay,
  weekCount = 26,
}: {
  questions: HabitQuestion[];
  ranges: HabitRange[];
  selected?: string;
  onSelectDay?: (iso: string) => void;
  weekCount?: number;
}) {
  const today = todayIso();
  const [localDay, setLocalDay] = useState(today);
  const selected = selectedProp ?? localDay;
  const [overlay, setOverlay] = useState<Record<string, Tick | null>>({});
  const [pending, setPending] = useState<string | null>(null);

  function selectDay(iso: string) {
    if (!selectedProp) setLocalDay(iso);
    onSelectDay?.(iso);
  }

  const base = useMemo(() => {
    const map: Record<string, Tick> = {};
    for (const range of ranges) {
      for (const day of range.days) {
        for (const [key, cell] of Object.entries(day.cells)) {
          if (cell) map[overlayKey(key, day.date)] = cell.tick;
        }
      }
    }
    return map;
  }, [ranges]);

  function tickFor(habitKey: string, date: string): Tick | undefined {
    const id = overlayKey(habitKey, date);
    if (Object.prototype.hasOwnProperty.call(overlay, id)) {
      return overlay[id] ?? undefined;
    }
    return base[id];
  }

  function cellsFor(habitKey: string): CellMap {
    const cells: CellMap = {};
    for (const [id, tick] of Object.entries(base)) {
      if (id.startsWith(`${habitKey}|`)) cells[id.slice(habitKey.length + 1)] = tick;
    }
    for (const [id, tick] of Object.entries(overlay)) {
      if (id.startsWith(`${habitKey}|`)) {
        cells[id.slice(habitKey.length + 1)] = tick ?? undefined;
      }
    }
    return cells;
  }

  async function toggle(habitKey: string, date: string) {
    if (date > today) return;
    const current = tickFor(habitKey, date);
    const next: Tick | null = isFilledTick(current) ? null : "yes";
    const id = overlayKey(habitKey, date);
    setOverlay((prev) => ({ ...prev, [id]: next }));
    setPending(id);
    try {
      await saveTick(habitKey, date, next);
    } catch {
      setOverlay((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    } finally {
      setPending(null);
    }
  }

  if (questions.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-text-muted">
        No habits yet.
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      {questions.map((question) => (
        <HabitChainCard
          key={question.id}
          label={question.label}
          habitKey={question.key}
          color={habitColor(question.key)}
          cells={cellsFor(question.key)}
          selected={selected}
          today={today}
          weekCount={weekCount}
          busy={pending?.startsWith(`${question.key}|`) ?? false}
          onToggle={(date) => {
            selectDay(date);
            void toggle(question.key, date);
          }}
          onCheck={() => void toggle(question.key, selected)}
        />
      ))}
    </div>
  );
}

function HabitChainCard({
  label,
  habitKey,
  color,
  cells,
  selected,
  today,
  weekCount,
  busy,
  onToggle,
  onCheck,
}: {
  label: string;
  habitKey: string;
  color: string;
  cells: CellMap;
  selected: string;
  today: string;
  weekCount: number;
  busy: boolean;
  onToggle: (iso: string) => void;
  onCheck: () => void;
}) {
  const columns = useMemo(
    () => weekColumns(today, weekCount),
    [today, weekCount],
  );
  const selectedTick = cells[selected];
  const done = isFilledTick(selectedTick);
  const half = selectedTick === "partial";
  const streak = habitStreak(cells, selected);

  return (
    <article className="rounded-2xl border border-line bg-surface px-4 py-3.5">
      <div className="mb-3 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-medium text-text">{label}</h3>
          {streak >= 2 ? (
            <p className="mt-0.5 text-xs font-medium" style={{ color }}>
              {streak} days
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onCheck}
          disabled={busy || selected > today}
          aria-pressed={done}
          aria-label={
            done
              ? half
                ? `${label}, half done. Tap to clear.`
                : `${label}, done. Tap to clear.`
              : `${label}, not logged. Tap to mark done.`
          }
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full transition-transform disabled:opacity-40",
            "hover:scale-[0.96] active:scale-[0.92]",
          )}
        >
          <span
            className="flex size-7 items-center justify-center rounded-full"
            style={
              done
                ? { background: color, color: "#101012" }
                : { boxShadow: "inset 0 0 0 1.5px var(--line-strong)" }
            }
            aria-hidden
          >
            {done ? (
              half ? (
                <MinusIcon size={14} weight="bold" />
              ) : (
                <CheckIcon size={14} weight="bold" />
              )
            ) : null}
          </span>
        </button>
      </div>
      <div
        role="img"
        aria-label={`${label} over the last ${weekCount} weeks`}
        className="flex w-full gap-[3px]"
      >
        {columns.map((week, weekIndex) => (
          <div
            key={`${habitKey}-${weekIndex}`}
            className="flex min-w-0 flex-1 flex-col gap-[3px]"
          >
            {week.map((iso) => {
              const tick = cells[iso];
              const future = iso > today;
              const filled = isFilledTick(tick);
              const isSelected = iso === selected;
              const isToday = iso === today;
              let fill = "var(--surface-raised)";
              if (future) fill = "transparent";
              else if (filled) fill = color;
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={future}
                  title={`${label}, ${formatDayWeekday(iso)}${
                    filled ? (tick === "partial" ? ", partly" : ", done") : ""
                  }`}
                  onClick={() => onToggle(iso)}
                  className={cn(
                    "aspect-square w-full rounded-[2px] disabled:cursor-default",
                    isSelected && "ring-1 ring-text",
                  )}
                  style={{
                    background: fill,
                    opacity: future ? 0.2 : tick === "partial" ? 0.45 : 1,
                    boxShadow:
                      isToday && !filled
                        ? `inset 0 0 0 1px ${color}`
                        : undefined,
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </article>
  );
}
