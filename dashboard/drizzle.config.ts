import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Only the `hub` schema is managed here. `public` holds the shared
  // exercise library, which this app reads but must never migrate.
  schemaFilter: ["hub"],
  verbose: true,
});
