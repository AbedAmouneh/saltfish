import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { getDb } from "~/db/client.server";
import { scores } from "~/db/schema";
import { serverSecret } from "./secret.server";
import { GAME_LIMITS, type GameId, type LeaderRow, type Period } from "./games";

const sign = (payload: string) => createHmac("sha256", serverSecret()).update(payload).digest("base64url");

/** A signed "game started at" ticket, so a score can't be posted without playing. */
export function startTicket(game: GameId): string {
  const payload = `${game}.${Date.now()}.${randomBytes(6).toString("base64url")}`;
  return `${payload}.${sign(payload)}`;
}

export function checkTicket(ticket: string, game: GameId, score: number): { ok: true } | { ok: false; reason: string } {
  const [g, ts, nonce, sig] = ticket.split(".");
  if (!g || !ts || !nonce || !sig || g !== game) return { ok: false, reason: "ticket" };
  const expected = sign(`${g}.${ts}.${nonce}`);
  if (expected.length !== sig.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return { ok: false, reason: "ticket" };
  const seconds = (Date.now() - Number(ts)) / 1000;
  const lim = GAME_LIMITS[game];
  if (seconds > 60 * 60) return { ok: false, reason: "expired" };
  if (score > lim.max || seconds < lim.minSeconds || score > lim.perSecond * seconds + 50) return { ok: false, reason: "implausible" };
  return { ok: true };
}

/**
 * Very small multilingual word filter; staff can also hide names in /staff/scores.
 * Long words are blocked anywhere in a name; short ones only as a whole word,
 * so names like "Essex" or "Dickson" still get through.
 */
const BLOCKED_WHOLE = ["sex", "dick", "كس", "زب"];
const BLOCKED = ["fuck", "shit", "bitch", "cunt", "pussy", "nigg", "porn", "merde", "pute", "salope", "connard", "encul", "طيز", "شرموط", "منيك", "عرص"];
export function cleanNickname(raw: string): string | null {
  const name = raw
    .normalize("NFKC")
    // control characters, zero-width and bidi overrides (used to hide or flip words), angle brackets
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 16);
  if (name.length < 2) return null;
  const lower = name.toLowerCase();
  const flat = lower.replace(/[\s._\-*0-9]/g, "");
  if (BLOCKED.some((w) => flat.includes(w))) return null;
  const words = lower.split(/[^\p{L}]+/u).filter(Boolean);
  if (words.some((w) => BLOCKED_WHOLE.includes(w)) || BLOCKED_WHOLE.includes(flat)) return null;
  return name;
}

export async function saveScore(v: { game: GameId; nickname: string; score: number; branch?: string; tableNo?: number; ipHash: string }) {
  const db = await getDb();
  const [row] = await db
    .insert(scores)
    .values({ game: v.game, nickname: v.nickname, score: v.score, branch: v.branch ?? null, tableNo: v.tableNo ?? null, ipHash: v.ipHash })
    .returning();
  return row!;
}

function since(period: Period) {
  if (period === "tonight") return sql`now() - interval '12 hours'`;
  if (period === "week") return sql`now() - interval '7 days'`;
  return sql`'epoch'::timestamptz`;
}

export async function leaderboard(game: GameId, period: Period, branch?: string, limit = 10): Promise<LeaderRow[]> {
  const db = await getDb();
  const conds = [eq(scores.game, game), eq(scores.hidden, false), gte(scores.createdAt, since(period))];
  if (branch) conds.push(eq(scores.branch, branch));
  const rows = await db
    .select({ nickname: scores.nickname, score: scores.score, branch: scores.branch, tableNo: scores.tableNo, createdAt: scores.createdAt })
    .from(scores)
    .where(and(...conds))
    .orderBy(desc(scores.score), scores.createdAt)
    .limit(limit);
  return rows.map((r) => ({ nickname: r.nickname, score: r.score, branch: r.branch, tableNo: r.tableNo, at: r.createdAt.toISOString() }));
}

/** 1-based rank of a score within the period. */
export async function rankOf(game: GameId, period: Period, score: number, branch?: string): Promise<number> {
  const db = await getDb();
  const conds = [eq(scores.game, game), eq(scores.hidden, false), gte(scores.createdAt, since(period)), sql`${scores.score} > ${score}`];
  if (branch) conds.push(eq(scores.branch, branch));
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(scores)
    .where(and(...conds));
  return (r?.n ?? 0) + 1;
}

/** Latest scores. Branch staff see their tables only; managers (branches = null) also see website scores. */
export async function recentScores(limit = 100, branches: string[] | null = null) {
  const db = await getDb();
  const cols = {
    id: scores.id,
    game: scores.game,
    nickname: scores.nickname,
    score: scores.score,
    branch: scores.branch,
    tableNo: scores.tableNo,
    hidden: scores.hidden,
    createdAt: scores.createdAt,
  };
  const q = db.select(cols).from(scores);
  return (branches ? q.where(inArray(scores.branch, branches)) : q).orderBy(desc(scores.createdAt)).limit(limit);
}

export async function setScoreHidden(id: string, hidden: boolean, branches: string[] | null = null) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  const db = await getDb();
  const conds = [eq(scores.id, id)];
  if (branches) conds.push(inArray(scores.branch, branches));
  await db
    .update(scores)
    .set({ hidden })
    .where(and(...conds));
}
