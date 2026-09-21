import {
  index,
  jsonb,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./auth";
import {
  connectionProviderEnum,
  connectionStatusEnum,
  hub,
  type ConnectionProvider,
  type ConnectionStatus,
} from "./_shared";

/**
 * One row per external health source the user has linked (or tried to).
 * Web placeholders for Health Connect / Google Fit live here; iOS HealthKit
 * writes a real connected status when authorization succeeds.
 */
export const connectedSources = hub.table(
  "connected_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: connectionProviderEnum("provider")
      .$type<ConnectionProvider>()
      .notNull(),
    status: connectionStatusEnum("status")
      .$type<ConnectionStatus>()
      .notNull()
      .default("disconnected"),
    displayName: text("display_name"),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    lastError: text("last_error"),
    meta: jsonb("meta").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("connected_sources_user_provider_uq").on(t.userId, t.provider),
    index("connected_sources_user_idx").on(t.userId),
  ],
);

export type ConnectedSource = typeof connectedSources.$inferSelect;
export type NewConnectedSource = typeof connectedSources.$inferInsert;
