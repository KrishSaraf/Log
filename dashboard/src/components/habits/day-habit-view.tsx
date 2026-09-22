"use client";

import {
  CaretLeftIcon,
  CaretRightIcon,
  ScalesIcon,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import { HabitChainBoard } from "@/components/habits/habit-chain";
import { isFilledTick } from "@/lib/habit-chain";
import {
  formatDayWeekday,
  formatKg,
  formatLongDate,
  todayIso,
} from "@/lib/format";
import type {
  HabitDay,
  HabitQuestion,
  HabitRange,
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

  const [selected, setSelected] = useState(today);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));

  const days = weekDays(weekStart);
  const day = dayIndex.get(selected);
  const weight =
    day?.weightKg ??
    weights.find((point) => point.date === selected)?.kg ??
    null;
  const daySessions = sessions.filter((session) => session.date === selected);
  const doneCount = questions.filter((q) =>
    isFilledTick(day?.cells[q.key]?.tick),
  ).length;
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
                ? "border-lime-line bg-lime-quiet text-lime"
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
                    ? "bg-lime text-on-lime"
                    : "bg-surface-raised text-text-muted hover:bg-white/[0.04] hover:text-text",
                )}
              >
                <span
                  className={cn(
                    "text-[10px] font-medium uppercase tracking-wide",
                    isSelected ? "text-on-lime/70" : "text-text-faint",
                  )}
                >
                  {weekday}
                </span>
                <span
                  className={cn(
                    "num text-base font-semibold leading-none",
                    isSelected ? "text-on-lime" : "text-text",
                  )}
                >
                  {d}
                </span>
                <span
                  className={cn(
                    "mt-0.5 size-1 rounded-full",
                    hasLog
                      ? isSelected
                        ? "bg-on-lime"
                        : "bg-lime"
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
        <section>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-medium text-text">Habits</h2>
            <p className="text-xs text-text-faint">Tap a square to mark the day</p>
          </div>
          <HabitChainBoard
            questions={questions}
            ranges={ranges}
            selected={selected}
            onSelectDay={selectDay}
            weekCount={36}
          />
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
