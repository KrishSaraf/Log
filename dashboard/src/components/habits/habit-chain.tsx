"use client";

import {
  BarbellIcon,
  BookIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CheckIcon,
  CircleIcon,
  CircleNotchIcon,
  FirstAidIcon,
  ForkKnifeIcon,
  LeafIcon,
  MinusIcon,
  MoonIcon,
  PersonSimpleRunIcon,
  PillIcon,
  SunIcon,
  ToothIcon,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";

import { habitBlurb, habitColor } from "@/lib/habit-color";
import {
  addDaysIso,
  habitStreak,
  isFilledTick,
  startOfWeekMonday,
  weekColumns,
} from "@/lib/habit-chain";
import { formatDayWeekday, formatLongDate, todayIso } from "@/lib/format";
import type { HabitQuestion, HabitRange, Tick } from "@/lib/habits";
import { cn } from "@/lib/utils";

type CellMap = Record<string, Tick | undefined>;

const TILE = 13;
const GAP = 3;
const WEEKS = 20;
const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"] as const;
const ON_FILL = "#0A0C08";

const ICONS: Record<string, Icon> = {
  gym: BarbellIcon,
  cardio_sport: PersonSimpleRunIcon,
  diet: LeafIcon,
  protein: ForkKnifeIcon,
  morning_skincare: SunIcon,
  night_clean: MoonIcon,
  brush: ToothIcon,
  m: BookIcon,
  doc_rehab: FirstAidIcon,
  multivitamin: PillIcon,
};

function overlayKey(habitKey: string, date: string) {
  return `${habitKey}|${date}`;
}

function monthShort(iso: string) {
  const [y, m] = iso.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "short" });
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
  weekCount = WEEKS,
  muted = false,
}: {
  questions: HabitQuestion[];
  ranges: HabitRange[];
  selected?: string;
  onSelectDay?: (iso: string) => void;
  weekCount?: number;
  muted?: boolean;
}) {
  const today = todayIso();
  const [localDay, setLocalDay] = useState(today);
  const selected = selectedProp ?? localDay;
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(today));
  const [overlay, setOverlay] = useState<Record<string, Tick | null>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [justChecked, setJustChecked] = useState<string | null>(null);
  const showStrip = !muted && selectedProp === undefined;

  function selectDay(iso: string) {
    if (!selectedProp) {
      setLocalDay(iso);
      setWeekStart(startOfWeekMonday(iso));
    }
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
    if (next) {
      setJustChecked(id);
      window.setTimeout(() => {
        setJustChecked((prev) => (prev === id ? null : prev));
      }, 480);
    }
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

  if (questions.length === 0) return null;

  const doneToday = questions.filter((q) =>
    isFilledTick(tickFor(q.key, selected)),
  ).length;
  const total = questions.length;
  const progress = total > 0 ? doneToday / total : 0;
  const weekDays = Array.from({ length: 7 }, (_, i) =>
    addDaysIso(weekStart, i),
  );
  const loggedDays = new Set(
    weekDays.filter((iso) =>
      questions.some((q) => isFilledTick(tickFor(q.key, iso))),
    ),
  );

  return (
    <div className="space-y-5">
      {showStrip ? (
        <BoardHeader
          selected={selected}
          today={today}
          done={doneToday}
          total={total}
          progress={progress}
          weekStart={weekStart}
          loggedDays={loggedDays}
          onPrevWeek={() => setWeekStart(addDaysIso(weekStart, -7))}
          onNextWeek={() => setWeekStart(addDaysIso(weekStart, 7))}
          onSelectDay={selectDay}
          onJumpToday={() => selectDay(today)}
        />
      ) : null}

      <div className="space-y-3">
        {questions.map((question, index) => (
          <HabitChainCard
            key={question.id}
            label={question.label}
            habitKey={question.key}
            color={habitColor(question.key)}
            cells={cellsFor(question.key)}
            selected={selected}
            today={today}
            weekCount={weekCount}
            muted={muted}
            busy={pending?.startsWith(`${question.key}|`) ?? false}
            popping={justChecked === overlayKey(question.key, selected)}
            delay={index * 40}
            onToggle={(date) => {
              selectDay(date);
              void toggle(question.key, date);
            }}
            onCheck={() => void toggle(question.key, selected)}
          />
        ))}
      </div>
    </div>
  );
}

function BoardHeader({
  selected,
  today,
  done,
  total,
  progress,
  weekStart,
  loggedDays,
  onPrevWeek,
  onNextWeek,
  onSelectDay,
  onJumpToday,
}: {
  selected: string;
  today: string;
  done: number;
  total: number;
  progress: number;
  weekStart: string;
  loggedDays: Set<string>;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onSelectDay: (iso: string) => void;
  onJumpToday: () => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDaysIso(weekStart, i));

  return (
    <header className="reveal space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="label-caps mb-1.5 text-lime">
            {selected === today ? "Today" : formatDayWeekday(selected)}
          </p>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-text text-pretty sm:text-3xl">
            {formatLongDate(selected)}
          </h1>
          <p className="mt-1.5 text-sm text-text-muted">
            <span className="num text-lime">{done}</span>
            <span className="mx-1 text-text-faint">of</span>
            <span className="num">{total}</span>
            <span className="mx-1.5 text-text-faint">·</span>
            {done === 0
              ? "Nothing marked yet"
              : done === total
                ? "All marked"
                : `${total - done} still open`}
          </p>
        </div>
        {selected !== today ? (
          <button
            type="button"
            onClick={onJumpToday}
            className="min-h-11 rounded-lg border border-lime-line bg-lime-quiet px-3 text-sm font-medium text-lime transition-opacity hover:opacity-90"
          >
            Jump to today
          </button>
        ) : null}
      </div>

      <div
        className="h-1 overflow-hidden rounded-full bg-surface-raised"
        role="progressbar"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${done} of ${total} habits marked`}
      >
        <div
          className="h-full rounded-full bg-lime transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      <div className="rounded-2xl border border-line bg-surface p-2 sm:p-2.5">
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <button
            type="button"
            aria-label="Previous week"
            onClick={onPrevWeek}
            className="flex size-11 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-white/[0.04] hover:text-text"
          >
            <CaretLeftIcon size={16} weight="bold" />
          </button>
          <p className="text-xs font-medium text-text-muted">
            {formatDayWeekday(days[0])} – {formatDayWeekday(days[6])}
          </p>
          <button
            type="button"
            aria-label="Next week"
            onClick={onNextWeek}
            className="flex size-11 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-white/[0.04] hover:text-text"
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
            const future = iso > today;
            return (
              <button
                key={iso}
                type="button"
                role="tab"
                disabled={future}
                aria-selected={isSelected}
                onClick={() => onSelectDay(iso)}
                className={cn(
                  "relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center",
                  "transition-colors duration-150 disabled:cursor-default disabled:opacity-35",
                  isSelected
                    ? "bg-lime text-on-lime"
                    : "bg-surface-raised text-text-muted hover:bg-white/[0.04] hover:text-text",
                  isToday && !isSelected && "ring-1 ring-lime/50",
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
                    loggedDays.has(iso)
                      ? isSelected
                        ? "bg-on-lime"
                        : "bg-lime"
                      : "bg-transparent",
                  )}
                  aria-hidden
                />
              </button>
            );
          })}
        </div>
      </div>
    </header>
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
  muted,
  busy,
  popping,
  delay,
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
  muted: boolean;
  busy: boolean;
  popping: boolean;
  delay: number;
  onToggle: (iso: string) => void;
  onCheck: () => void;
}) {
  const columns = useMemo(
    () => weekColumns(today, weekCount),
    [today, weekCount],
  );
  const scroller = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [weekCount]);

  const selectedTick = cells[selected];
  const done = isFilledTick(selectedTick);
  const half = selectedTick === "partial";
  const streak = habitStreak(cells, selected);
  const Icon = ICONS[habitKey] ?? CircleIcon;
  const blurb = streak >= 2 ? `${streak}-day streak` : habitBlurb(habitKey);

  const months: { week: number; label: string }[] = [];
  let lastMonth = "";
  columns.forEach((days, i) => {
    const key = days[0].slice(0, 7);
    if (key !== lastMonth) {
      lastMonth = key;
      months.push({ week: i, label: monthShort(days[0]) });
    }
  });

  const colW = TILE + GAP;
  const gridW = weekCount * TILE + (weekCount - 1) * GAP;

  return (
    <article
      className={cn(
        "rounded-xl border border-line bg-surface p-4",
        "transition-colors duration-150 hover:border-line-strong",
        muted && "opacity-70",
      )}
      style={{
        animation: "reveal-up 320ms var(--ease-out-quint) both",
        animationDelay: `${delay}ms`,
      }}
    >
      <div className="mb-3.5 flex items-center gap-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-full"
          style={{ background: `${color}24`, color }}
          aria-hidden
        >
          <Icon size={18} weight="fill" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-[17px] font-semibold tracking-tight text-text">
            {label}
          </h3>
          <p
            className="truncate text-[13px] text-text-muted"
            style={streak >= 2 ? { color } : undefined}
          >
            {blurb}
          </p>
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
            "flex size-11 shrink-0 items-center justify-center",
            "transition-transform duration-150 hover:scale-[0.96] active:scale-[0.96]",
            "disabled:opacity-40",
            popping && "habit-tick-pop",
          )}
        >
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-[8px]",
              "transition-[background-color,box-shadow] duration-150",
              popping && "habit-glow-flash",
            )}
            style={
              done
                ? { background: color, color: ON_FILL }
                : {
                    boxShadow: `inset 0 0 0 1.5px color-mix(in oklab, ${color} 55%, transparent)`,
                  }
            }
            aria-hidden
          >
            {busy ? (
              <CircleNotchIcon size={14} className="animate-spin" />
            ) : done ? (
              <span className={cn(popping && "habit-check-in", "flex")}>
                {half ? (
                  <MinusIcon size={14} weight="bold" />
                ) : (
                  <CheckIcon size={14} weight="bold" />
                )}
              </span>
            ) : null}
          </span>
        </button>
      </div>

      <div
        ref={scroller}
        className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div style={{ width: gridW + 22 }} className="min-w-full">
          <div className="mb-1.5 flex" style={{ paddingLeft: 22 }}>
            <div className="relative h-3" style={{ width: gridW }}>
              {months.map((month) => (
                <span
                  key={`${month.label}-${month.week}`}
                  className="absolute text-[10px] leading-none text-text-faint"
                  style={{ left: month.week * colW }}
                >
                  {month.label}
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-1.5">
            <div
              className="flex shrink-0 flex-col justify-between py-px"
              style={{ height: 7 * TILE + 6 * GAP, width: 14 }}
              aria-hidden
            >
              {WEEKDAYS.map((day, i) => (
                <span
                  key={`${day}-${i}`}
                  className="text-[9px] leading-[13px] text-text-faint"
                >
                  {i % 2 === 0 ? day : ""}
                </span>
              ))}
            </div>
            <div
              role="img"
              aria-label={`${label} over the last ${weekCount} weeks`}
              className="grid grid-flow-col grid-rows-7"
              style={{
                gap: GAP,
                gridAutoColumns: TILE,
                width: gridW,
              }}
            >
              {columns.flat().map((iso) => {
                const tick = cells[iso];
                const future = iso > today;
                const filled = isFilledTick(tick);
                const isSelected = iso === selected;
                const isToday = iso === today;
                let fill = `color-mix(in oklab, ${color} 22%, #141416)`;
                if (future) fill = "transparent";
                else if (filled) fill = color;
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={future}
                    aria-pressed={filled}
                    title={`${label}, ${formatDayWeekday(iso)}${
                      filled ? (tick === "partial" ? ", partly" : ", done") : ""
                    }`}
                    onClick={() => onToggle(iso)}
                    className={cn(
                      "size-[13px] rounded-[3px] transition-[transform,filter] duration-150",
                      "hover:enabled:brightness-125 hover:enabled:scale-110",
                      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-lime",
                      "disabled:cursor-default",
                      isSelected && "ring-1 ring-text/80",
                    )}
                    style={{
                      background: fill,
                      opacity: future ? 0.18 : tick === "partial" ? 0.5 : 1,
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
        </div>
      </div>
    </article>
  );
}
