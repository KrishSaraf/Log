import { eq } from "drizzle-orm";

import {
  connectedSources,
  db,
  type ConnectionProvider,
  type ConnectionStatus,
  type ConnectedSource,
} from "@/db";
import { safely } from "@/lib/safe-query";

export type ConnectionCatalogItem = {
  provider: ConnectionProvider;
  name: string;
  description: string;
  /** Where the real hook lives today. */
  platform: "ios" | "android" | "web" | "any";
  /** True when this stack can open a native auth flow. */
  hookAvailable: boolean;
  comingSoon?: boolean;
};

export const CONNECTION_CATALOG: ConnectionCatalogItem[] = [
  {
    provider: "apple_health",
    name: "Apple Health",
    description: "Activity rings, heart rate, sleep, and workouts via HealthKit.",
    platform: "ios",
    hookAvailable: true,
  },
  {
    provider: "health_connect",
    name: "Health Connect",
    description: "Android vitals and activity through Google Health Connect.",
    platform: "android",
    hookAvailable: false,
    comingSoon: true,
  },
  {
    provider: "google_fit",
    name: "Google Fit",
    description: "Legacy Google Fit streams where Health Connect is unavailable.",
    platform: "android",
    hookAvailable: false,
    comingSoon: true,
  },
  {
    provider: "manual_import",
    name: "Manual import",
    description: "Apple Health XML export and spreadsheet imports.",
    platform: "any",
    hookAvailable: true,
  },
];

export type ConnectionView = ConnectionCatalogItem & {
  status: ConnectionStatus;
  displayName: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
  rowId: string | null;
};

export async function loadConnections(
  userId: string,
): Promise<ConnectionView[]> {
  const rows = await safely(
    () =>
      db
        .select()
        .from(connectedSources)
        .where(eq(connectedSources.userId, userId)),
    [] as ConnectedSource[],
    "connected sources",
  );

  const byProvider = new Map(rows.map((r) => [r.provider, r]));

  return CONNECTION_CATALOG.map((item) => {
    const row = byProvider.get(item.provider);
    return {
      ...item,
      status: row?.status ?? "disconnected",
      displayName: row?.displayName ?? null,
      lastSyncAt: row?.lastSyncAt ? row.lastSyncAt.toISOString() : null,
      lastError: row?.lastError ?? null,
      rowId: row?.id ?? null,
    };
  });
}

export async function upsertConnectionStatus(input: {
  userId: string;
  provider: ConnectionProvider;
  status: ConnectionStatus;
  displayName?: string | null;
  lastError?: string | null;
}) {
  const [row] = await db
    .insert(connectedSources)
    .values({
      userId: input.userId,
      provider: input.provider,
      status: input.status,
      displayName: input.displayName ?? null,
      lastError: input.lastError ?? null,
      lastSyncAt: input.status === "connected" ? new Date() : null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [connectedSources.userId, connectedSources.provider],
      set: {
        status: input.status,
        displayName: input.displayName ?? null,
        lastError: input.lastError ?? null,
        lastSyncAt: input.status === "connected" ? new Date() : null,
        updatedAt: new Date(),
      },
    })
    .returning();

  return row;
}
