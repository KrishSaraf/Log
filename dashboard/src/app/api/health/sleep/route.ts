import { NextResponse } from "next/server";

import { authErrorResponse, requireUserId } from "@/lib/auth-user";
import { toNumber } from "@/lib/format";
import {
  loadSleepHistory,
  parseIsoDate,
  upsertSleepSession,
} from "@/lib/health-log";
import type { Source } from "@/db";

export const runtime = "nodejs";

const SOURCES = new Set<Source>(["manual", "photo", "import", "apple_health"]);

function parseOptionalDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);
    const url = new URL(req.url);
    const from = url.searchParams.get("from") ?? undefined;
    const limit = Number(url.searchParams.get("limit") ?? 60);
    const rows = await loadSleepHistory({
      userId,
      from,
      limit: Number.isFinite(limit) ? limit : 60,
    });
    return NextResponse.json({
      sessions: rows.map((row) => ({
        id: row.id,
        date: row.date,
        totalMinutes: row.totalMinutes,
        quality: row.quality,
        startedAt: row.startedAt?.toISOString() ?? null,
        endedAt: row.endedAt?.toISOString() ?? null,
        source: row.source,
        notes: row.notes,
      })),
    });
  } catch (err) {
    return (
      authErrorResponse(err) ??
      NextResponse.json({ error: "Could not load sleep." }, { status: 500 })
    );
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId(req);
    const body = (await req.json()) as {
      date?: string;
      totalMinutes?: number | string;
      /** Hours + minutes convenience. */
      hours?: number | string;
      minutes?: number | string;
      startedAt?: string | null;
      endedAt?: string | null;
      quality?: number | string | null;
      notes?: string | null;
      source?: Source;
    };

    let total = toNumber(body.totalMinutes ?? null);
    if (total === null) {
      const hours = toNumber(body.hours ?? null) ?? 0;
      const minutes = toNumber(body.minutes ?? null) ?? 0;
      total = hours * 60 + minutes;
    }

    if (total === null || total <= 0) {
      return NextResponse.json(
        { error: "Provide totalMinutes or hours/minutes." },
        { status: 400 },
      );
    }

    const startedAt = parseOptionalDate(body.startedAt);
    const endedAt = parseOptionalDate(body.endedAt);
    if (startedAt && endedAt && total <= 0) {
      total = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000);
    }

    const row = await upsertSleepSession({
      userId,
      date: parseIsoDate(body.date),
      totalMinutes: total,
      startedAt,
      endedAt,
      quality: toNumber(body.quality ?? null),
      notes: body.notes ?? null,
      source: body.source && SOURCES.has(body.source) ? body.source : "manual",
    });

    return NextResponse.json({
      id: row.id,
      date: row.date,
      totalMinutes: row.totalMinutes,
      quality: row.quality,
      startedAt: row.startedAt?.toISOString() ?? null,
      endedAt: row.endedAt?.toISOString() ?? null,
      source: row.source,
    });
  } catch (err) {
    return (
      authErrorResponse(err) ??
      NextResponse.json({ error: "Could not save sleep." }, { status: 500 })
    );
  }
}
