/** Local calendar day as YYYY-MM-DD, matching the `date` columns in Postgres. */
export function todayIso(now = new Date()) {
  return now.toLocaleDateString("en-CA");
}

/** "Saturday, 19 September" for page headers. */
export function formatLongDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** "19 Sep" for chart axes and dense rows. */
export function formatShortDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

/** Minutes to "7h 12m", or "48m" under an hour. */
export function formatDuration(minutes: number) {
  const whole = Math.round(minutes);
  const h = Math.floor(whole / 60);
  const m = whole % 60;
  return h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** Postgres numeric columns arrive as strings; this is the safe way back. */
export function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Body weight in kg. One decimal unless the stored value needs two. */
export function formatKg(value: number) {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded * 10) ? rounded.toFixed(1) : rounded.toFixed(2);
}

/** "June 2024" for month group headers. */
export function formatMonthYear(iso: string) {
  const [y, m] = iso.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

/** "Sat 1 Jun" for dense history rows. */
export function formatDayWeekday(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
