/**
 * Runs a database read and falls back instead of throwing. The dashboard is
 * read-mostly and a missing Postgres should degrade to empty states rather
 * than a crashed route.
 */
export async function safely<T>(
  run: () => Promise<T>,
  fallback: T,
  context?: string,
): Promise<T> {
  try {
    return await run();
  } catch (error) {
    console.error(`[db] ${context ?? "query"} failed`, error);
    return fallback;
  }
}
