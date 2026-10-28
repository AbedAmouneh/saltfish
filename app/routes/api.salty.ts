import Anthropic from "@anthropic-ai/sdk";
import type { ActionFunctionArgs } from "react-router";
import { z } from "zod";
import { getBranch } from "~/content";
import { hashIp } from "~/lib/bookings.server";
import { LOCALES } from "~/lib/locale";
import { logError } from "~/lib/log.server";
import { isForeignOrigin } from "~/lib/origin.server";
import { hitAll } from "~/lib/rate-limit.server";
import { knowledgePack } from "~/lib/salty/knowledge.server";
import { contextNote, SALTY_RULES } from "~/lib/salty/prompt.server";
import { clientIp } from "~/lib/staff.server";

const Body = z
  .object({
    messages: z
      .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(800) }))
      .min(1)
      .max(16)
      .refine((m) => m[m.length - 1]?.role === "user", "last message must be from the guest")
      // The model needs the conversation to open with the guest; older turns may have been trimmed
      .transform((m) => m.slice(m.findIndex((x) => x.role === "user"))),
    locale: z.enum(LOCALES),
    branch: z.enum(["naccache", "faqra"]).optional(),
    table: z.number().int().min(1).max(200).optional(),
  })
  .refine((b) => !b.table || (!!b.branch && b.table <= getBranch(b.branch).tables), "table");

const MODEL = process.env.SALTY_MODEL ?? "claude-haiku-5-5";
/** Per table (or per phone off-site), per connection, and for the whole site per day. */
const MESSAGES_PER_10_MIN = 20;
const CONNECTION_PER_10_MIN = 150; // a full restaurant shares one Wi-Fi address
const DAILY_LIMIT = Number(process.env.SALTY_DAILY_LIMIT ?? 3000);

const text = (body: string, status = 200) =>
  new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });

/**
 * POST /api/salty → streams Salty's reply as plain text.
 * Without ANTHROPIC_API_KEY (local development) it streams a demo reply.
 */
export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") return text("Method not allowed", 405);
  if (isForeignOrigin(request)) return text("Forbidden", 403);

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await request.json());
  } catch {
    return text("Bad request", 400);
  }

  const ip = hashIp(clientIp(request));
  const seat = body.branch && body.table ? `${body.branch}:${body.table}` : "web";
  try {
    const ok = await hitAll([
      [`salty:${ip}:${seat}`, MESSAGES_PER_10_MIN, 10],
      [`salty:${ip}`, CONNECTION_PER_10_MIN, 10],
      ["salty:all", DAILY_LIMIT, 24 * 60],
    ]);
    if (!ok) return text("rate-limited", 429);
  } catch (e) {
    // Without the counters there is no cost guard, so Salty takes a break rather than running unmetered.
    logError("salty rate limit check failed", e);
    return text("Salty is unavailable", 503);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return demoStream(body.messages.at(-1)!.content);

  const client = new Anthropic({ apiKey });
  // Open the stream before answering, so a bad key, an outage or an overload becomes a clean 503
  // the chat can show, instead of an unhandled error halfway through the response.
  let stream: Awaited<ReturnType<typeof openStream>>;
  try {
    stream = await openStream(client, body);
  } catch (e) {
    logError("salty request failed", e);
    return text("Salty is unavailable", 503);
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") controller.enqueue(encoder.encode(event.delta.text));
        }
        controller.close();
      } catch (e) {
        logError("salty stream failed", e);
        controller.error(e);
      }
    },
    cancel() {
      stream.controller.abort();
    },
  });
  return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
}

function openStream(client: Anthropic, body: z.infer<typeof Body>) {
  return client.messages.create({
    stream: true,
    model: MODEL,
    max_tokens: 500,
    system: [
      { type: "text", text: SALTY_RULES },
      // The knowledge pack is identical for every guest, so it is cached.
      { type: "text", text: `KNOWLEDGE\n${knowledgePack()}`, cache_control: { type: "ephemeral" } },
      { type: "text", text: contextNote(body) },
    ],
    messages: body.messages,
  });
}

export function loader() {
  return text("Salty only answers POST requests.", 405);
}

/** Local development without an API key: a short scripted reply, streamed like the real thing. */
function demoStream(question: string) {
  const reply = `(Demo mode: add ANTHROPIC_API_KEY to talk to the real Salty.) You asked: "${question.slice(0, 120)}". Try the Zaatar White Fish Tiradito ($24) and a Salmon Handroll ($11), or [book a counter seat](/book?seating=counter). 🐟`;
  const encoder = new TextEncoder();
  const words = reply.split(/(?<= )/);
  return new Response(
    new ReadableStream({
      async start(c) {
        for (const w of words) {
          c.enqueue(encoder.encode(w));
          await new Promise((r) => setTimeout(r, 18));
        }
        c.close();
      },
    }),
    { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } },
  );
}
