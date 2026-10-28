import { and, eq, gte, lt, sql } from "drizzle-orm";
import { getDb } from "~/db/client.server";
import { rateEvents } from "~/db/schema";

/**
 * Sliding-window limit stored in Postgres, so it works across serverless
 * instances. Records the attempt first and then counts, so two requests
 * arriving at the same moment can't both slip under the limit.
 * Returns false when `key` has gone over `limit` hits in the window.
 */
export async function hit(key: string, limit: number, windowMinutes: number): Promise<boolean> {
  const db = await getDb();
  await db.insert(rateEvents).values({ key });
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(rateEvents)
    .where(and(eq(rateEvents.key, key), gte(rateEvents.createdAt, sql`now() - make_interval(mins => ${windowMinutes})`)));
  // Occasionally prune anything older than a day.
  if (Math.random() < 0.02) await db.delete(rateEvents).where(lt(rateEvents.createdAt, sql`now() - interval '1 day'`));
  return (row?.n ?? 0) <= limit;
}

/** Checks several limits together; all of them must pass. */
export async function hitAll(limits: [key: string, limit: number, windowMinutes: number][]): Promise<boolean> {
  const results = await Promise.all(limits.map(([k, l, w]) => hit(k, l, w)));
  return results.every(Boolean);
}
