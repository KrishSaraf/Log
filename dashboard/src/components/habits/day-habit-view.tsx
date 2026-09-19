"use client";

import {
  CaretLeftIcon,
  CaretRightIcon,
  CheckIcon,
  MinusIcon,
  ScalesIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import {
  formatDayWeekday,
  formatKg,
  formatLongDate,
  todayIso,
} from "@/lib/format";
import type {
  HabitCell,
  HabitDay,
  HabitQuestion,
  HabitRange,
  Tick,
  WorkoutSession,
  WeightPoint,
} from "@/lib/habits";
import { cn } from "@/lib/utils";

type Props = {
  questions: HabitQuestion[];
  ranges: HabitRange[];
  weights: WeightPoint[];
  sessions: WorkoutSession[];
};

function addDays(iso: string, delta: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + delta);
  return date.toLocaleDateString("en-CA");
}

function startOfWeek(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const weekday = date.getDay(); // 0 Sun
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  date.setDate(date.getDate() + mondayOffset);
  return date.toLocaleDateString("en-CA");
}

function weekDays(weekStart: string) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

function buildDayIndex(ranges: HabitRange[]) {
  const map = new Map<string, HabitDay>();
  for (const range of ranges) {
    for (const day of range.days) {
      map.set(day.date, day);
    }
  }
  return map;
}

function defaultSelectedDate(ranges: HabitRange[], today: string) {
  let withWeight: string | null = null;
  for (const range of ranges) {
    for (const day of range.days) {
      if (Object.keys(day.cells).length > 0) return day.date;
      if (withWeight === null && day.weightKg !== null) withWeight = day.date;
    }
  }
  return withWeight ?? today;
}

function tickLabel(tick: Tick | null) {
  if (tick === "yes") return "Done";
  if (tick === "partial") return "Partly";
  if (tick === "no") return "Not done";
  return "Not logged";
}

function HabitRow({
  label,
  cell,
}: {
  label: string;
  cell: HabitCell | undefined;
}) {
  const tick = cell?.tick ?? null;
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5 transition-colors",
        tick === "yes" && "border-ember-line bg-ember-quiet/40",
        tick === "partial" && "border-ember-line/60 bg-surface-raised",
        tick === "no" && "border-line bg-surface",
        tick === null && "border-line border-dashed bg-transparent",
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-[15px] font-medium text-text">{label}</p>
        {cell?.note ? (
          <p className="mt-0.5 truncate text-xs text-text-muted">{cell.note}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span
          className={cn(
            "text-xs font-medium",
            tick === "yes" && "text-ember",
            tick === "partial" && "text-ember-bright",
            tick === "no" && "text-text-faint",
            tick === null && "text-text-faint",
          )}
        >
          {tickLabel(tick)}
        </span>
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-full",
            tick === "yes" && "bg-ember text-on-ember",
            tick === "partial" && "border border-ember-line bg-ember-quiet text-ember",
            tick === "no" && "bg-surface-raised text-text-faint",
            tick === null && "border border-dashed border-line text-text-faint",
          )}
          aria-hidden
        >
          {tick === "yes" ? (
            <CheckIcon size={16} weight="bold" />
          ) : tick === "partial" ? (
            <MinusIcon size={16} weight="bold" />
          ) : tick === "no" ? (
            <XIcon size={14} weight="bold" />
          ) : (
            <span className="size-1.5 rounded-full bg-text-faint/50" />
          )}
        </span>
      </div>
    </div>
  );
}

export function DayHabitView({ questions, ranges, weights, sessions }: Props) {
  const today = todayIso();
  const dayIndex = useMemo(() => buildDayIndex(ranges), [ranges]);
  const loggedSet = useMemo(() => {
    const set = new Set<string>();
    for (const day of dayIndex.values()) {
      if (day.weightKg !== null || Object.keys(day.cells).length > 0) {
        set.add(day.date);
      }
    }
    for (const session of sessions) set.add(session.date);
    return set;
  }, [dayIndex, sessions]);

  const [selected, setSelected] = useState(() =>
    defaultSelectedDate(ranges, today),
  );
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(defaultSelectedDate(ranges, today)),
  );

  const days = weekDays(weekStart);
  const day = dayIndex.get(selected);
  const weight =
    day?.weightKg ??
    weights.find((point) => point.date === selected)?.kg ??
    null;
  const daySessions = sessions.filter((session) => session.date === selected);
  const doneCount = questions.filter((q) => {
    const tick = day?.cells[q.key]?.tick;
    return tick === "yes" || tick === "partial";
  }).length;
  const loggedCount = questions.filter((q) => day?.cells[q.key]).length;

  function selectDay(iso: string) {
    setSelected(iso);
    setWeekStart(startOfWeek(iso));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-caps mb-1">Today · {formatDayWeekday(today)}</p>
          <h1 className="text-2xl font-medium tracking-tight text-text sm:text-3xl">
            {formatLongDate(selected)}
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            {loggedCount === 0
              ? "Nothing marked this day."
              : `${doneCount} of ${loggedCount} habits done`}
            {weight !== null ? ` · ${formatKg(weight)} kg` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => selectDay(today)}
            className={cn(
              "min-h-11 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
              selected === today
                ? "border-ember-line bg-ember-quiet text-ember"
                : "border-line text-text-muted hover:border-line-strong hover:text-text",
            )}
          >
            Jump to today
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-2 sm:p-3">
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <button
            type="button"
            aria-label="Previous week"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            className="flex size-11 items-center justify-center rounded-lg border border-line text-text-muted transition-colors hover:border-line-strong hover:text-text"
          >
            <CaretLeftIcon size={16} weight="bold" />
          </button>
          <p className="text-xs font-medium text-text-muted">
            {formatDayWeekday(days[0])} – {formatDayWeekday(days[6])}
          </p>
          <button
            type="button"
            aria-label="Next week"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            className="flex size-11 items-center justify-center rounded-lg border border-line text-text-muted transition-colors hover:border-line-strong hover:text-text"
          >
            <CaretRightIcon size={16} weight="bold" />
          </button>
        </div>

        <div
          role="tablist"
          aria-label="Days of the week"
          className="grid grid-cols-7 gap-1.5"
        >
          {days.map((iso) => {
            const [y, m, d] = iso.split("-").map(Number);
            const weekday = new Date(y, m - 1, d).toLocaleDateString("en-GB", {
              weekday: "short",
            });
            const isSelected = iso === selected;
            const isToday = iso === today;
            const hasLog = loggedSet.has(iso);
            return (
              <button
                key={iso}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => selectDay(iso)}
                className={cn(
                  "relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2.5 text-center transition-colors",
                  isSelected
                    ? "bg-ember text-on-ember"
                    : "bg-surface-raised text-text-muted hover:bg-white/[0.04] hover:text-text",
                )}
              >
                <span
                  className={cn(
                    "text-[10px] font-medium uppercase tracking-wide",
                    isSelected ? "text-on-ember/70" : "text-text-faint",
                  )}
                >
                  {weekday}
                </span>
                <span
                  className={cn(
                    "num text-base font-semibold leading-none",
                    isSelected ? "text-on-ember" : "text-text",
                  )}
                >
                  {d}
                </span>
                <span
                  className={cn(
                    "mt-0.5 size-1 rounded-full",
                    hasLog
                      ? isSelected
                        ? "bg-on-ember"
                        : "bg-ember"
                      : "bg-transparent",
                  )}
                  aria-hidden
                />
                {isToday && !isSelected ? (
                  <span className="sr-only">Today</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
        <section className="space-y-2">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-medium text-text">Habits</h2>
            <p className="text-xs text-text-faint">
              Blank means you never opened the tracker that day
            </p>
          </div>
          {questions.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-text-muted">
              No habits set up yet.
            </p>
          ) : (
            <div className="space-y-2">
              {questions.map((question) => (
                <HabitRow
                  key={question.id}
                  label={question.label}
                  cell={day?.cells[question.key]}
                />
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-3">
          <div className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-center gap-2 text-text-muted">
              <ScalesIcon size={16} />
              <p className="label-caps">Weight</p>
            </div>
            <p className="num mt-3 text-3xl font-medium tracking-tight text-text">
              {weight !== null ? formatKg(weight) : "—"}
              {weight !== null ? (
                <span className="ml-1 text-base font-normal text-text-faint">
                  kg
                </span>
              ) : null}
            </p>
            <p className="mt-1 text-xs text-text-faint">
              {weight !== null ? formatDayWeekday(selected) : "No reading"}
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="label-caps">Sessions</p>
            {daySessions.length === 0 ? (
              <p className="mt-3 text-sm text-text-faint">None this day</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {daySessions.map((session) => (
                  <li
                    key={session.id}
                    className="rounded-lg bg-surface-raised px-3 py-2 text-sm text-text"
                  >
                    {session.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
