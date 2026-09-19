import { pool } from "@/db";

/** Placeholder account that owns imported spreadsheet history. */
export const LEGACY_USER_ID = "00000000-0000-4000-8000-000000000001";
export const LEGACY_EMAIL = "legacy@log.local";
export const DEV_DISPLAY_NAME = "Krish (local)";

const claimedFor = new Set<string>();
let claimInFlight: Promise<void> | null = null;

/**
 * Move imported rows from the legacy owner onto `targetUserId` once.
 * Safe to call on every sign-in / page load: no-ops if already claimed
 * or if the caller already is the legacy user.
 */
export async function claimLegacyDataIfNeeded(targetUserId: string): Promise<void> {
  if (!targetUserId || targetUserId === LEGACY_USER_ID) return;
  if (claimedFor.has(targetUserId)) return;

  if (claimInFlight) {
    await claimInFlight;
    if (claimedFor.has(targetUserId)) return;
  }

  claimInFlight = runClaim(targetUserId).finally(() => {
    claimInFlight = null;
  });
  await claimInFlight;
}

async function runClaim(targetUserId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const leftover = await client.query<{ n: number }>(
      `SELECT (
         (SELECT count(*) FROM hub.questions WHERE user_id = $1) +
         (SELECT count(*) FROM hub.question_responses WHERE user_id = $1) +
         (SELECT count(*) FROM hub.workouts WHERE user_id = $1) +
         (SELECT count(*) FROM hub.health_metrics WHERE user_id = $1) +
         (SELECT count(*) FROM hub.meals WHERE user_id = $1) +
         (SELECT count(*) FROM hub.insights WHERE user_id = $1)
       )::int AS n`,
      [LEGACY_USER_ID],
    );

    if ((leftover.rows[0]?.n ?? 0) === 0) {
      await client.query("COMMIT");
      claimedFor.add(targetUserId);
      return;
    }

    const legacyQs = await client.query<{ id: string; key: string }>(
      `SELECT id, key FROM hub.questions WHERE user_id = $1`,
      [LEGACY_USER_ID],
    );
    const targetQs = await client.query<{ id: string; key: string }>(
      `SELECT id, key FROM hub.questions WHERE user_id = $1`,
      [targetUserId],
    );
    const targetByKey = new Map(targetQs.rows.map((row) => [row.key, row.id]));

    for (const question of legacyQs.rows) {
      const existingId = targetByKey.get(question.key);
      if (existingId) {
        await client.query(
          `UPDATE hub.question_responses
           SET question_id = $1, user_id = $2
           WHERE question_id = $3
             AND NOT EXISTS (
               SELECT 1 FROM hub.question_responses t
               WHERE t.user_id = $2
                 AND t.question_id = $1
                 AND t.date = hub.question_responses.date
             )`,
          [existingId, targetUserId, question.id],
        );
        await client.query(`DELETE FROM hub.question_responses WHERE question_id = $1`, [
          question.id,
        ]);
        await client.query(`DELETE FROM hub.questions WHERE id = $1`, [question.id]);
      } else {
        await client.query(`UPDATE hub.questions SET user_id = $1 WHERE id = $2`, [
          targetUserId,
          question.id,
        ]);
      }
    }

    await client.query(
      `UPDATE hub.question_responses SET user_id = $1
       WHERE user_id = $2
         AND NOT EXISTS (
           SELECT 1 FROM hub.question_responses t
           WHERE t.user_id = $1
             AND t.question_id = hub.question_responses.question_id
             AND t.date = hub.question_responses.date
         )`,
      [targetUserId, LEGACY_USER_ID],
    );
    await client.query(`DELETE FROM hub.question_responses WHERE user_id = $1`, [
      LEGACY_USER_ID,
    ]);

    await client.query(
      `UPDATE hub.workouts SET user_id = $1
       WHERE user_id = $2
         AND NOT EXISTS (
           SELECT 1 FROM hub.workouts t
           WHERE t.user_id = $1
             AND t.date = hub.workouts.date
             AND t.name IS NOT DISTINCT FROM hub.workouts.name
             AND t.source = hub.workouts.source
         )`,
      [targetUserId, LEGACY_USER_ID],
    );
    await client.query(`DELETE FROM hub.workouts WHERE user_id = $1`, [LEGACY_USER_ID]);

    await client.query(
      `UPDATE hub.health_metrics SET user_id = $1
       WHERE user_id = $2
         AND NOT EXISTS (
           SELECT 1 FROM hub.health_metrics t
           WHERE t.user_id = $1
             AND t.date = hub.health_metrics.date
             AND t.metric = hub.health_metrics.metric
             AND t.source = hub.health_metrics.source
         )`,
      [targetUserId, LEGACY_USER_ID],
    );
    await client.query(`DELETE FROM hub.health_metrics WHERE user_id = $1`, [
      LEGACY_USER_ID,
    ]);

    await client.query(`UPDATE hub.meals SET user_id = $1 WHERE user_id = $2`, [
      targetUserId,
      LEGACY_USER_ID,
    ]);
    await client.query(`UPDATE hub.insights SET user_id = $1 WHERE user_id = $2`, [
      targetUserId,
      LEGACY_USER_ID,
    ]);

    await client.query("COMMIT");
    claimedFor.add(targetUserId);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[auth] claim legacy data failed", error);
  } finally {
    client.release();
  }
}
