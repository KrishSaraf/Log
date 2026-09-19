/**
 * Date handling for Apple Health data.
 *
 * Every timestamp Apple emits carries the UTC offset that was in effect on the
 * device at that moment, e.g. `2024-02-06 14:30:00 -0800`. That offset is the
 * only reliable way to know which calendar day a sample belonged to from
 * Krish's point of view, so the default bucketing strategy uses it rather than
 * the server's timezone. Bucketing in UTC (or in the server's zone) silently
 * moves late-evening steps into the next day and is the single most common bug
 * in Apple Health importers.
 */

/** Matches `yyyy-MM-dd HH:mm:ss Z`, the format used by export.xml and Health Auto Export. */
const APPLE_TIMESTAMP =
  /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?\s*(Z|[+-]\d{2}:?\d{2})?$/;

export interface AppleTimestamp {
  /** Epoch milliseconds (absolute instant). */
  epochMs: number;
  /** Device UTC offset in minutes at the time of the sample, e.g. -480 for PST. */
  offsetMinutes: number;
}

/**
 * Parse an Apple timestamp without relying on `new Date(string)`, whose
 * behaviour for non-ISO formats is implementation-defined.
 *
 * Returns `null` for anything unparseable so the caller can skip the record
 * rather than poison the dataset with `Invalid Date`.
 */
export function parseAppleDate(raw: string | undefined | null): AppleTimestamp | null {
  if (!raw) return null;
  const match = APPLE_TIMESTAMP.exec(raw.trim());
  if (!match) return null;

  const [, y, mo, d, h, mi, s, frac, zone] = match;
  const millis = frac ? Number(frac.padEnd(3, "0").slice(0, 3)) : 0;

  let offsetMinutes = 0;
  if (zone && zone !== "Z") {
    const sign = zone[0] === "-" ? -1 : 1;
    const digits = zone.slice(1).replace(":", "");
    offsetMinutes = sign * (Number(digits.slice(0, 2)) * 60 + Number(digits.slice(2, 4)));
  }

  const asUtc = Date.UTC(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
    Number(s),
    millis,
  );
  if (Number.isNaN(asUtc)) return null;

  return { epochMs: asUtc - offsetMinutes * 60_000, offsetMinutes };
}

/**
 * How to decide which calendar day a timestamp belongs to.
 *
 * - `device-offset` (default): use the UTC offset embedded in the timestamp.
 *   Correct across travel and DST, and needs no configuration.
 * - `{ timeZone }`: force a single IANA zone. Use when you want every day to
 *   line up with home time even for samples recorded abroad.
 * - `utc`: bucket in UTC. Only sensible for debugging.
 */
export type DateBucketing = "device-offset" | "utc" | { timeZone: string };

const zoneFormatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = zoneFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    zoneFormatters.set(timeZone, formatter);
  }
  return formatter;
}

/** Format epoch milliseconds shifted by `offsetMinutes` as `YYYY-MM-DD`. */
function isoDateFromOffset(epochMs: number, offsetMinutes: number): string {
  return new Date(epochMs + offsetMinutes * 60_000).toISOString().slice(0, 10);
}

/** Resolve the `YYYY-MM-DD` bucket for a parsed Apple timestamp. */
export function localDate(timestamp: AppleTimestamp, bucketing: DateBucketing): string {
  if (bucketing === "utc") return isoDateFromOffset(timestamp.epochMs, 0);
  if (bucketing === "device-offset") {
    return isoDateFromOffset(timestamp.epochMs, timestamp.offsetMinutes);
  }
  // `en-CA` renders as YYYY-MM-DD, which is why it is used instead of `en-US`.
  return formatterFor(bucketing.timeZone).format(new Date(timestamp.epochMs));
}

/**
 * Day a sleep block belongs to.
 *
 * Convention: a night is labelled with the day you woke up on, matching the
 * Health app and Oura. Implemented by bucketing on the segment's *end* time.
 * A nap that starts and ends the same afternoon therefore lands on that day,
 * which is what you want.
 */
export function sleepDate(end: AppleTimestamp, bucketing: DateBucketing): string {
  return localDate(end, bucketing);
}

/** Whole minutes between two instants, never negative. */
export function minutesBetween(startMs: number, endMs: number): number {
  return Math.max(0, (endMs - startMs) / 60_000);
}
