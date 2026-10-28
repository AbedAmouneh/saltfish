import { sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;

let dbPromise: Promise<DB> | undefined;

/**
 * Production (Vercel): Neon Postgres over HTTP, from DATABASE_URL.
 * Local development without DATABASE_URL: an embedded Postgres (PGlite)
 * stored in ./.data so `npm run dev` works with zero setup.
 */
export function getDb(): Promise<DB> {
  dbPromise ??= connect().catch((e) => {
    dbPromise = undefined; // try again on the next request
    throw e;
  });
  return dbPromise;
}

async function connect(): Promise<DB> {
  const url = process.env.DATABASE_URL;
  let db: DB;
  if (url) {
    const { neon } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-http");
    db = drizzle(neon(url), { schema }) as unknown as DB;
  } else {
    if (process.env.NODE_ENV === "production" && process.env.VERCEL) {
      throw new Error("DATABASE_URL is not set. Add a Neon database in Vercel → Storage.");
    }
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const dataDir = process.env.PGLITE_DIR ?? "./.data/pglite";
    const { mkdir } = await import("node:fs/promises");
    await mkdir(dataDir, { recursive: true });
    db = drizzle(new PGlite(dataDir), { schema }) as unknown as DB;
  }
  for (const stmt of schema.CREATE_SQL) await db.execute(sql.raw(stmt));
  return db;
}
