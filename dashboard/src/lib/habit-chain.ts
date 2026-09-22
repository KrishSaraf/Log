import type { Tick } from "@/lib/habits";

export function isFilledTick(tick: Tick | string | null | undefined) {
  return Boolean(tick && tick !== "no");
}

export function addDaysIso(iso: string, delta: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + delta);
  return date.toLocaleDateString("en-CA");
}

/** Monday-start columns, each column 7 days (Mon → Sun). */
export function weekColumns(endIso: string, weekCount: number) {
  const [y, m, d] = endIso.split("-").map(Number);
  const end = new Date(y, m - 1, d);
  const weekday = end.getDay();
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
  const thisMonday = new Date(end);
  thisMonday.setDate(end.getDate() - daysFromMonday);
  const firstMonday = new Date(thisMonday);
  firstMonday.setDate(thisMonday.getDate() - (weekCount - 1) * 7);

  const columns: string[][] = [];
  for (let week = 0; week < weekCount; week++) {
    const days: string[] = [];
    for (let day = 0; day < 7; day++) {
      const cursor = new Date(firstMonday);
      cursor.setDate(firstMonday.getDate() + week * 7 + day);
      days.push(cursor.toLocaleDateString("en-CA"));
    }
    columns.push(days);
  }
  return columns;
}

export function habitStreak(
  cells: Record<string, Tick | undefined>,
  from: string,
) {
  let cursor = from;
  if (!isFilledTick(cells[cursor])) cursor = addDaysIso(cursor, -1);
  let count = 0;
  while (isFilledTick(cells[cursor])) {
    count += 1;
    cursor = addDaysIso(cursor, -1);
  }
  return count;
}

export function longestStreakFromDates(dates: string[]) {
  const days = [...new Set(dates)].sort();
  let best = 0;
  let run = 0;
  let previous: string | undefined;
  for (const day of days) {
    if (previous && addDaysIso(previous, 1) === day) run += 1;
    else run = 1;
    if (run > best) best = run;
    previous = day;
  }
  return best;
}

export function daysInclusive(start: string, end: string) {
  const a = new Date(`${start}T00:00:00`);
  const b = new Date(`${end}T00:00:00`);
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1);
}

/** Monday of the week that contains `iso`. */
export function startOfWeekMonday(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const weekday = date.getDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  date.setDate(date.getDate() + mondayOffset);
  return date.toLocaleDateString("en-CA");
}
