import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { z } from "zod";
import { branches, getBranch } from "~/content";
import { hashIp } from "~/lib/bookings.server";
import { GAMES, PERIODS } from "~/lib/games";
import { isForeignOrigin } from "~/lib/origin.server";
import { hit, hitAll } from "~/lib/rate-limit.server";
import { checkTicket, cleanNickname, leaderboard, rankOf, saveScore, startTicket } from "~/lib/scores.server";
import { clientIp } from "~/lib/staff.server";

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

/**
 * GET /api/scores?game=catch&period=tonight[&branch=naccache]  → leaderboard
 * GET /api/scores?start=catch                                   → signed ticket for a new round
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const start = z.enum(GAMES).safeParse(url.searchParams.get("start"));
  if (start.success) return json({ ticket: startTicket(start.data) });
  const game = z.enum(GAMES).safeParse(url.searchParams.get("game"));
  if (!game.success) return json({ error: "game" }, 400);
  const period = z.enum(PERIODS).catch("tonight").parse(url.searchParams.get("period"));
  const branch = branches.find((b) => b.id === url.searchParams.get("branch"))?.id;
  try {
    return json({ rows: await leaderboard(game.data, period, branch) });
  } catch (e) {
    console.error("leaderboard failed", e);
    return json({ rows: [] });
  }
}

const Body = z.object({
  game: z.enum(GAMES),
  score: z.number().int().min(0),
  nickname: z.string(),
  ticket: z.string().max(200),
  branch: z.enum(["naccache", "faqra"]).optional(),
  table: z.number().int().min(1).max(200).optional(),
});

/** POST /api/scores → saves a score, answers with tonight's rank. */
export async function action({ request }: ActionFunctionArgs) {
  if (isForeignOrigin(request)) return json({ error: "forbidden" }, 403);
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid" }, 400);
  const b = parsed.data;
  // A table number only makes sense together with its branch, and must exist there
  if (b.table && (!b.branch || b.table > getBranch(b.branch).tables)) return json({ error: "invalid" }, 400);
  const nickname = cleanNickname(b.nickname);
  if (!nickname) return json({ error: "nickname" }, 422);
  const check = checkTicket(b.ticket, b.game, b.score);
  if (!check.ok) return json({ error: check.reason }, 422);
  const ipHash = hashIp(clientIp(request));
  const seat = b.branch && b.table ? `${b.branch}:${b.table}` : "web";
  const allowed = await hitAll([
    [`score:${ipHash}:${seat}`, 30, 60],
    [`score:${ipHash}`, 300, 60], // the whole restaurant on one Wi-Fi
  ]);
  if (!allowed) return json({ error: "rate" }, 429);
  // Each round's ticket can post one score
  if (!(await hit(`ticket:${b.ticket.split(".").at(-1)}`, 1, 70))) return json({ error: "ticket" }, 422);
  const row = await saveScore({ game: b.game, nickname, score: b.score, branch: b.branch, tableNo: b.table, ipHash });
  return json({ ok: true, id: row.id, rank: await rankOf(b.game, "tonight", b.score, b.branch) });
}
