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

/**
 * Salty's brain, picked from whichever key is set:
 *   ANTHROPIC_API_KEY                  → Claude (default model claude-haiku-5-5)
 *   GEMINI_API_KEY                     → Google Gemini, free tier available (tries gemini-3.5-flash-lite, then 3.6 Flash, then 3.8 Flash)
 *   AI_API_KEY + AI_BASE_URL + SALTY_MODEL → any OpenAI-compatible service (Groq, OpenRouter, …)
 * None set → demo replies.
 */
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";
type Provider = { kind: "anthropic"; apiKey: string; model: string } | { kind: "openai-compatible"; apiKey: string; baseUrl: string; model: string };

function pickProvider(): Provider | null {
  const env = process.env;
  if (env.ANTHROPIC_API_KEY) return { kind: "anthropic", apiKey: env.ANTHROPIC_API_KEY, model: env.SALTY_MODEL || "claude-haiku-5-5" };
  if (env.GEMINI_API_KEY)
    return {
      kind: "openai-compatible",
      apiKey: env.GEMINI_API_KEY,
      baseUrl: GEMINI_BASE_URL,
      model: env.SALTY_MODEL || "gemini-3.5-flash-lite,gemini-3.6-flash,gemini-3.8-flash",
    };
  if (env.AI_API_KEY && env.AI_BASE_URL && env.SALTY_MODEL)
    return { kind: "openai-compatible", apiKey: env.AI_API_KEY, baseUrl: env.AI_BASE_URL.replace(/\/+$/, ""), model: env.SALTY_MODEL };
  return null;
}
/** Per table (or per phone off-site), per connection, and for the whole site per day. */
const MESSAGES_PER_10_MIN = 20;
const CONNECTION_PER_10_MIN = 150; // a full restaurant shares one Wi-Fi address
const DAILY_LIMIT = Number(process.env.SALTY_DAILY_LIMIT ?? 3000);

const text = (body: string, status = 200) =>
  new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });

/**
 * POST /api/salty → streams Salty's reply as plain text.
 * Without any AI key (local development) it streams a demo reply.
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

  const provider = pickProvider();
  if (!provider) return demoStream(body.messages.at(-1)!.content);

  // Open the stream before answering, so a bad key, an outage or a used-up quota becomes a clean 503
  // the chat can show, instead of an unhandled error halfway through the response.
  let chunks: AsyncIterable<string>;
  let abort: () => void;
  try {
    ({ chunks, abort } = provider.kind === "anthropic" ? await claudeStream(provider, body) : await openAiCompatibleStream(provider, body));
  } catch (e) {
    logError(`salty request failed (${provider.kind})`, e);
    return text("Salty is unavailable", 503);
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      } catch (e) {
        logError("salty stream failed", e);
        controller.error(e);
      }
    },
    cancel() {
      abort();
    },
  });
  return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
}

type Streamed = { chunks: AsyncIterable<string>; abort: () => void };
type Body = z.infer<typeof Body>;

async function claudeStream(p: Extract<Provider, { kind: "anthropic" }>, body: Body): Promise<Streamed> {
  const client = new Anthropic({ apiKey: p.apiKey });
  const stream = await client.messages.create({
    stream: true,
    model: p.model,
    max_tokens: 500,
    system: [
      { type: "text", text: SALTY_RULES },
      // The knowledge pack is identical for every guest, so it is cached.
      { type: "text", text: `KNOWLEDGE\n${knowledgePack()}`, cache_control: { type: "ephemeral" } },
      { type: "text", text: contextNote(body) },
    ],
    messages: body.messages,
  });
  return {
    chunks: (async function* () {
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") yield event.delta.text;
      }
    })(),
    abort: () => stream.controller.abort(),
  };
}

/** Gemini (and other OpenAI-compatible services): chat completions streamed as server-sent events. */
async function openAiCompatibleStream(p: Extract<Provider, { kind: "openai-compatible" }>, body: Body): Promise<Streamed> {
  const controller = new AbortController();
  const startedAt = Date.now();
  const timeout = setTimeout(() => controller.abort(new Error(`no answer from ${p.baseUrl} within 55s`)), 55_000);
  const messages = [{ role: "system", content: `${SALTY_RULES}\n\nKNOWLEDGE\n${knowledgePack()}\n\n${contextNote(body)}` }, ...body.messages];
  // SALTY_MODEL can list several models: when one is overloaded or out of free quota, try the next.
  const models = p.model
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  const failures: string[] = [];
  let res: Response | undefined;
  try {
    for (const model of models) {
      // Each model gets 15s to start answering; an overloaded one sometimes never does.
      const attemptCtl = new AbortController();
      const attemptTimer = setTimeout(() => attemptCtl.abort(new Error("no answer within 15s")), 15_000);
      let attempt: Response;
      try {
        attempt = await fetch(`${p.baseUrl}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.apiKey}` },
          body: JSON.stringify({
            model,
            stream: true,
            max_tokens: 800,
            // Gemini's newer models think before answering by default, which delays the first word. Salty's
            // answers come from the knowledge pack, so light thinking is enough. Other services may not accept it.
            ...(p.baseUrl === GEMINI_BASE_URL ? { reasoning_effort: "low" } : {}),
            messages,
          }),
          signal: AbortSignal.any([controller.signal, attemptCtl.signal]),
        });
      } catch (e) {
        if (controller.signal.aborted || !attemptCtl.signal.aborted) throw e;
        failures.push(`${model}: no answer within 15s`);
        continue;
      } finally {
        clearTimeout(attemptTimer);
      }
      if (attempt.ok && attempt.body) {
        console.log(`salty: ${model} answered in ${Date.now() - startedAt}ms${failures.length ? ` (after ${failures.join("; ")})` : ""}`);
        res = attempt;
        break;
      }
      failures.push(`${model} ${attempt.status}: ${(await attempt.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 200)}`);
      // A rejected key fails the same way for every model.
      if (attempt.status === 401 || attempt.status === 403) break;
    }
  } finally {
    clearTimeout(timeout);
  }
  if (!res?.body) throw new Error(`${p.baseUrl} failed after ${Date.now() - startedAt}ms: ${failures.join(" | ")}`);
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();

  return {
    chunks: (async function* () {
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) return;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const data = line.trim();
          if (!data.startsWith("data:")) continue;
          const payload = data.slice(5).trim();
          if (payload === "[DONE]") return;
          const delta = JSON.parse(payload)?.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta) yield delta;
        }
      }
    })(),
    abort: () => {
      reader.cancel().catch(() => {});
      controller.abort();
    },
  };
}

export function loader() {
  return text("Salty only answers POST requests.", 405);
}

/** Local development without an API key: a short scripted reply, streamed like the real thing. */
function demoStream(question: string) {
  const reply = `(Demo mode: add GEMINI_API_KEY or ANTHROPIC_API_KEY to talk to the real Salty.) You asked: "${question.slice(0, 120)}". Try the Zaatar White Fish Tiradito ($24) and a Salmon Handroll ($11), or [book a counter seat](/book?seating=counter). 🐟`;
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
