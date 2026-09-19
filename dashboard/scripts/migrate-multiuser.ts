/**
 * One-shot migration: Auth tables + user_id on personal data.
 *
 *   npx tsx scripts/migrate-multiuser.ts
 *
 * Safe to re-run: uses IF NOT EXISTS / checks before altering.
 * Existing imported rows are assigned to a legacy owner account so nothing is lost.
 * After you sign in with Google/Apple, claim that data:
 *   LEGACY_OWNER_EMAIL=you@gmail.com CLAIM=1 npx tsx scripts/migrate-multiuser.ts
 */

import { config } from "dotenv";
import { Client } from "pg";

config({ path: ".env.local" });

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://krishsaraf@localhost:5432/log_all";

const LEGACY_USER_ID = "00000000-0000-4000-8000-000000000001";
/** Placeholder account that holds imported rows until claimed. */
const LEGACY_EMAIL = "legacy@log.local";

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS hub.users (
        id text PRIMARY KEY,
        name text,
        email text NOT NULL UNIQUE,
        email_verified timestamptz,
        image text,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS hub.accounts (
        user_id text NOT NULL REFERENCES hub.users(id) ON DELETE CASCADE,
        type text NOT NULL,
        provider text NOT NULL,
        provider_account_id text NOT NULL,
        refresh_token text,
        access_token text,
        expires_at integer,
        token_type text,
        scope text,
        id_token text,
        session_state text,
        PRIMARY KEY (provider, provider_account_id)
      );

      CREATE TABLE IF NOT EXISTS hub.sessions (
        session_token text PRIMARY KEY,
        user_id text NOT NULL REFERENCES hub.users(id) ON DELETE CASCADE,
        expires timestamptz NOT NULL
      );

      CREATE TABLE IF NOT EXISTS hub.verification_tokens (
        identifier text NOT NULL,
        token text NOT NULL,
        expires timestamptz NOT NULL,
        PRIMARY KEY (identifier, token)
      );
    `);

    await client.query(
      `INSERT INTO hub.users (id, name, email)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING`,
      [LEGACY_USER_ID, "Imported data", LEGACY_EMAIL],
    );

    // Ensure legacy id exists even if email conflicted with a different id
    const legacy = await client.query(
      `SELECT id FROM hub.users WHERE email = $1 OR id = $2 LIMIT 1`,
      [LEGACY_EMAIL, LEGACY_USER_ID],
    );
    const ownerId = (legacy.rows[0]?.id as string) ?? LEGACY_USER_ID;
    if (!legacy.rows[0]) {
      await client.query(
        `INSERT INTO hub.users (id, name, email) VALUES ($1, $2, $3)`,
        [LEGACY_USER_ID, "Imported data", LEGACY_EMAIL],
      );
    }

    const tables = [
      "workouts",
      "health_metrics",
      "meals",
      "questions",
      "question_responses",
      "insights",
    ] as const;

    for (const table of tables) {
      await client.query(`
        ALTER TABLE hub.${table}
        ADD COLUMN IF NOT EXISTS user_id text REFERENCES hub.users(id) ON DELETE CASCADE
      `);
      await client.query(
        `UPDATE hub.${table} SET user_id = $1 WHERE user_id IS NULL`,
        [ownerId],
      );
      await client.query(`
        DO $$ BEGIN
          ALTER TABLE hub.${table} ALTER COLUMN user_id SET NOT NULL;
        EXCEPTION WHEN others THEN NULL;
        END $$;
      `);
    }

    // Rebuild unique indexes to be per-user
    await client.query(`
      DROP INDEX IF EXISTS hub.health_metrics_day_metric_source_uq;
      DROP INDEX IF EXISTS hub.questions_key_uq;
      DROP INDEX IF EXISTS hub.workouts_day_name_source_uq;
      DROP INDEX IF EXISTS hub.question_responses_question_day_uq;

      CREATE UNIQUE INDEX IF NOT EXISTS health_metrics_user_day_metric_source_uq
        ON hub.health_metrics (user_id, date, metric, source);
      CREATE UNIQUE INDEX IF NOT EXISTS questions_user_key_uq
        ON hub.questions (user_id, key);
      CREATE UNIQUE INDEX IF NOT EXISTS workouts_user_day_name_source_uq
        ON hub.workouts (user_id, date, name, source);
      CREATE UNIQUE INDEX IF NOT EXISTS question_responses_user_question_day_uq
        ON hub.question_responses (user_id, question_id, date);

      CREATE INDEX IF NOT EXISTS health_metrics_user_metric_date_idx
        ON hub.health_metrics (user_id, metric, date);
      CREATE INDEX IF NOT EXISTS questions_user_active_order_idx
        ON hub.questions (user_id, is_active, order_index);
      CREATE INDEX IF NOT EXISTS workouts_user_date_idx
        ON hub.workouts (user_id, date);
      CREATE INDEX IF NOT EXISTS meals_user_date_idx
        ON hub.meals (user_id, date);
      CREATE INDEX IF NOT EXISTS question_responses_user_date_idx
        ON hub.question_responses (user_id, date);
      CREATE INDEX IF NOT EXISTS insights_user_date_idx
        ON hub.insights (user_id, date);
    `);

    await client.query("COMMIT");
    console.log("Multi-user migration complete.");
    console.log(`Legacy/imported rows owned by user ${ownerId} (${LEGACY_EMAIL}).`);
    console.log(
      "After you sign in, set LEGACY_OWNER_EMAIL to your Google/Apple email and re-run with CLAIM=1 to move that data onto your account.",
    );
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }

  if (process.env.CLAIM === "1") {
    const email = process.env.LEGACY_OWNER_EMAIL;
    if (!email || email === "legacy@log.local") {
      await client.end();
      throw new Error("Set LEGACY_OWNER_EMAIL to your real login email to claim.");
    }
    try {
      await client.query("BEGIN");
      const legacy = await client.query(
        `SELECT id FROM hub.users WHERE email = $1 OR id = $2 LIMIT 1`,
        [LEGACY_EMAIL, LEGACY_USER_ID],
      );
      const ownerId = (legacy.rows[0]?.id as string) ?? LEGACY_USER_ID;
      const u = await client.query(`SELECT id FROM hub.users WHERE email = $1`, [email]);
      if (!u.rows[0]) throw new Error(`No user with email ${email} yet — sign in once first.`);
      const newId = u.rows[0].id as string;
      const tables = [
        "workouts",
        "health_metrics",
        "meals",
        "questions",
        "question_responses",
        "insights",
      ] as const;
      for (const table of tables) {
        const r = await client.query(
          `UPDATE hub.${table} SET user_id = $1 WHERE user_id = $2`,
          [newId, ownerId],
        );
        console.log(`  claimed ${table}: ${r.rowCount} rows`);
      }
      await client.query("COMMIT");
      console.log(`Claimed legacy data onto ${email} (${newId}).`);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      await client.end();
    }
  } else {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
