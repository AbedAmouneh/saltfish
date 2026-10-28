import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "~/db/client.server";
import { feedback, type Feedback } from "~/db/schema";
import { hashIp, RateLimitError } from "./bookings.server";
import { FEEDBACK_TAGS } from "./feedback-tags";
import { LOCALES } from "./locale";
import { hitAll } from "./rate-limit.server";

export const FeedbackInput = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  tags: z
    .string()
    .default("")
    .transform((s) => [...new Set(s.split(","))].filter((t) => (FEEDBACK_TAGS as readonly string[]).includes(t)).join(",")),
  comment: z.string().trim().max(1000).default(""),
  locale: z.enum(LOCALES),
  website: z.string().max(0).optional().default(""),
});

export async function addFeedback(branch: string, tableNo: number, input: z.infer<typeof FeedbackInput>, ip: string) {
  const db = await getDb();
  const ipHash = hashIp(ip);
  // Guests share the restaurant Wi-Fi, so the limit is per table, with a looser cap per connection.
  const ok = await hitAll([
    [`feedback:${ipHash}:${branch}:${tableNo}`, 3, 60],
    [`feedback:${ipHash}`, 60, 60],
  ]);
  if (!ok) throw new RateLimitError();
  const [row] = await db
    .insert(feedback)
    .values({ branch, tableNo, rating: input.rating, tags: input.tags, comment: input.comment, locale: input.locale, ipHash })
    .returning();
  return row;
}

export async function listFeedback(branches: string[], days: number): Promise<Feedback[]> {
  const db = await getDb();
  return db
    .select()
    .from(feedback)
    .where(and(inArray(feedback.branch, branches), gte(feedback.createdAt, sql`now() - make_interval(days => ${days})`)))
    .orderBy(desc(feedback.createdAt))
    .limit(500);
}
