import { NextResponse } from "next/server";

import { authErrorResponse, requireUserId } from "@/lib/auth-user";
import { toNumber } from "@/lib/format";
import {
  loadMetricSeries,
  parseIsoDate,
  upsertHealthMetric,
} from "@/lib/health-log";
import type { Source } from "@/db";

export const runtime = "nodejs";

const SOURCES = new Set<Source>(["manual", "photo", "import", "apple_health"]);

export async function GET(req: Request) {
  try {
    const userId = await requireUserId(req);
    const url = new URL(req.url);
    const metric = url.searchParams.get("metric")?.trim();
    if (!metric) {
      return NextResponse.json(
        { error: "Pass ?metric=weight_kg (or another key)." },
        { status: 400 },
      );
    }
    const from = url.searchParams.get("from") ?? undefined;
    const to = url.searchParams.get("to") ?? undefined;
    const limit = Number(url.searchParams.get("limit") ?? 180);
    const points = await loadMetricSeries({
      userId,
      metric,
      from,
      to,
      limit: Number.isFinite(limit) ? limit : 180,
    });
    return NextResponse.json({ metric, points });
  } catch (err) {
    return (
      authErrorResponse(err) ??
      NextResponse.json({ error: "Could not load metrics." }, { status: 500 })
    );
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId(req);
    const body = (await req.json()) as {
      date?: string;
      kg?: number | string;
      value?: number | string;
      metric?: string;
      unit?: string | null;
      source?: Source;
      /** Convenience: log several metrics in one request. */
      entries?: Array<{
        metric: string;
        value: number | string;
        unit?: string | null;
        date?: string;
      }>;
    };

    if (Array.isArray(body.entries) && body.entries.length > 0) {
      const saved = [];
      for (const entry of body.entries) {
        const value = toNumber(entry.value);
        if (value === null || !entry.metric?.trim()) continue;
        saved.push(
          await upsertHealthMetric({
            userId,
            date: parseIsoDate(entry.date ?? body.date),
            metric: entry.metric.trim(),
            value,
            unit: entry.unit,
            source:
              body.source && SOURCES.has(body.source) ? body.source : "manual",
          }),
        );
      }
      if (saved.length === 0) {
        return NextResponse.json({ error: "No valid entries." }, { status: 400 });
      }
      return NextResponse.json({ entries: saved });
    }

    const metric = body.metric?.trim() || "weight_kg";
    const raw = body.kg ?? body.value;
    const value = toNumber(raw ?? null);
    if (value === null) {
      return NextResponse.json({ error: "Missing value." }, { status: 400 });
    }

    const row = await upsertHealthMetric({
      userId,
      date: parseIsoDate(body.date),
      metric,
      value,
      unit: body.unit,
      source: body.source && SOURCES.has(body.source) ? body.source : "manual",
    });

    return NextResponse.json(row);
  } catch (err) {
    return (
      authErrorResponse(err) ??
      NextResponse.json({ error: "Could not save reading." }, { status: 500 })
    );
  }
}
