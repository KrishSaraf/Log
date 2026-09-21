import { NextResponse } from "next/server";

import {
  CONNECTION_CATALOG,
  upsertConnectionStatus,
} from "@/lib/connections";
import { authErrorResponse, requireUserId } from "@/lib/auth-user";
import type { ConnectionProvider, ConnectionStatus } from "@/db";

export const runtime = "nodejs";

const PROVIDERS = new Set(
  CONNECTION_CATALOG.map((c) => c.provider),
);

const STATUSES = new Set<ConnectionStatus>([
  "disconnected",
  "pending",
  "connected",
  "error",
]);

export async function POST(req: Request) {
  try {
    const userId = await requireUserId(req);
    const body = (await req.json()) as {
      provider?: string;
      status?: string;
      displayName?: string | null;
      lastError?: string | null;
    };

    if (!body.provider || !PROVIDERS.has(body.provider as ConnectionProvider)) {
      return NextResponse.json({ error: "Unknown provider." }, { status: 400 });
    }
    if (!body.status || !STATUSES.has(body.status as ConnectionStatus)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }

    const provider = body.provider as ConnectionProvider;
    const status = body.status as ConnectionStatus;
    const catalog = CONNECTION_CATALOG.find((c) => c.provider === provider);

    const row = await upsertConnectionStatus({
      userId,
      provider,
      status,
      displayName: body.displayName ?? catalog?.name ?? null,
      lastError: body.lastError ?? null,
    });

    return NextResponse.json({
      provider: row.provider,
      status: row.status,
      displayName: row.displayName,
      lastSyncAt: row.lastSyncAt ? row.lastSyncAt.toISOString() : null,
      lastError: row.lastError,
      rowId: row.id,
    });
  } catch (err) {
    return (
      authErrorResponse(err) ??
      NextResponse.json({ error: "Could not update connection." }, { status: 500 })
    );
  }
}
