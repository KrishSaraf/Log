import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy dashboard/.env.example to dashboard/.env.local.",
  );
}

// Next dev recreates modules on every hot reload, so the pool is cached on
// globalThis to avoid leaking a new set of connections each time.
const globalForDb = globalThis as unknown as { __hubPool?: Pool };

const pool =
  globalForDb.__hubPool ?? new Pool({ connectionString, max: 10 });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__hubPool = pool;
}

export const db = drizzle(pool, { schema });

export { pool, schema };
export * from "./schema";
