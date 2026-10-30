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
 * Salty's brain: every service whose key is set, tried in this order until one answers.
 *   GEMINI_API_KEY   → Google Gemini, free tier (models in GEMINI_MODELS, default 3.5 Flash-Lite, 3.6 Flash, 3.8 Flash)
 *   GROQ_API_KEY     → Groq, free tier (models in GROQ_MODELS, default gpt-oss-120b, then gpt-oss-20b)
 *   ANTHROPIC_API_KEY → Claude (SALTY_CLAUDE_MODEL, default claude-haiku-5-5)
 *   AI_API_KEY + AI_BASE_URL + SALTY_MODEL → any other OpenAI-compatible service
 * A busy, stalled, rate-limited or rejected model falls through to the next one. None set → demo replies.
 * Gemini comes before Claude so an ANTHROPIC_API_KEY exported by a shell profile can't take over locally.
 */
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
type Attempt =
  | { kind: "anthropic"; label: string; apiKey: string; model: string }
  | { kind: "openai-compatible"; label: string; apiKey: string; baseUrl: string; model: string; extra?: Record<string, unknown> };

const list = (v: string | undefined, fallback: string) =>
  (v || fallback)
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);

function attempts(): Attempt[] {
  const env = process.env;
  const out: Attempt[] = [];
  if (env.GEMINI_API_KEY)
    for (const model of list(env.GEMINI_MODELS, "gemini-3.5-flash-lite,gemini-3.6-flash,gemini-3.8-flash"))
      // Gemini's newer models think before answering by default; Salty's answers come from the knowledge pack, so keep it light.
      out.push({ kind: "openai-compatible", label: "gemini", apiKey: env.GEMINI_API_KEY, baseUrl: GEMINI_BASE_URL, model, extra: { reasoning_effort: "low" } });
  if (env.GROQ_API_KEY)
    for (const model of list(env.GROQ_MODELS, "openai/gpt-oss-120b,openai/gpt-oss-20b"))
      out.push({ kind: "openai-compatible", label: "groq", apiKey: env.GROQ_API_KEY, baseUrl: GROQ_BASE_URL, model, extra: { reasoning_effort: "low" } });
  if (env.ANTHROPIC_API_KEY)
    out.push({ kind: "anthropic", label: "claude", apiKey: env.ANTHROPIC_API_KEY, model: env.SALTY_CLAUDE_MODEL || "claude-haiku-5-5" });
  if (env.AI_API_KEY && env.AI_BASE_URL && env.SALTY_MODEL)
    for (const model of list(env.SALTY_MODEL, ""))
      out.push({ kind: "openai-compatible", label: "custom", apiKey: env.AI_API_KEY, baseUrl: env.AI_BASE_URL.replace(/\/+$/, ""), model });
  return out;
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

  const chain = attempts();
  if (!chain.length) return demoStream(body.messages.at(-1)!.content);

  // Open the stream before answering, so a bad key, an outage or a used-up quota becomes a clean 503
  // the chat can show, instead of an unhandled error halfway through the response.
  let chunks: AsyncIterable<string>;
  let abort: () => void;
  try {
    ({ chunks, abort } = await firstToAnswer(chain, body));
  } catch (e) {
    logError("salty request failed", e);
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

const TOTAL_MS = 55_000; // stay well inside the serverless function limit
const PER_MODEL_MS = 12_000; // an overloaded model sometimes never starts answering

/** Tries each model in turn and returns the first stream that starts. Throws with every failure if none does. */
async function firstToAnswer(chain: Attempt[], body: Body): Promise<Streamed> {
  const startedAt = Date.now();
  const failures: string[] = [];
  const deadKeys = new Set<string>();
  for (const a of chain) {
    if (deadKeys.has(a.apiKey)) continue;
    const left = TOTAL_MS - (Date.now() - startedAt);
    if (left < 2_000) {
      failures.push("out of time");
      break;
    }
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(new Error(`no answer within ${Math.round(Math.min(PER_MODEL_MS, left) / 1000)}s`)), Math.min(PER_MODEL_MS, left));
    try {
      const streamed = a.kind === "anthropic" ? await claudeStream(a, body, ctl) : await openAiCompatibleStream(a, body, ctl);
      console.log(`salty: ${a.label} ${a.model} answered in ${Date.now() - startedAt}ms${failures.length ? ` (after ${failures.join("; ")})` : ""}`);
      return streamed;
    } catch (e) {
      const status = (e as { status?: number }).status;
      failures.push(`${a.label} ${a.model}: ${e instanceof Error ? e.message : String(e)}`.slice(0, 240));
      // A rejected key fails the same way for every model on it.
      if (status === 401 || status === 403) deadKeys.add(a.apiKey);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`no model answered after ${Date.now() - startedAt}ms: ${failures.join(" | ")}`);
}

async function claudeStream(a: Extract<Attempt, { kind: "anthropic" }>, body: Body, ctl: AbortController): Promise<Streamed> {
  const client = new Anthropic({ apiKey: a.apiKey, maxRetries: 0 });
  const stream = await client.messages.create(
    {
      stream: true,
      model: a.model,
      max_tokens: 500,
      system: [
        { type: "text", text: SALTY_RULES },
        // The knowledge pack is identical for every guest, so it is cached.
        { type: "text", text: `KNOWLEDGE\n${knowledgePack()}`, cache_control: { type: "ephemeral" } },
        { type: "text", text: contextNote(body) },
      ],
      messages: body.messages,
    },
    { signal: ctl.signal },
  );
  return {
    chunks: (async function* () {
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") yield event.delta.text;
      }
    })(),
    abort: () => stream.controller.abort(),
  };
}

/** Gemini, Groq and other OpenAI-compatible services: chat completions streamed as server-sent events. */
async function openAiCompatibleStream(a: Extract<Attempt, { kind: "openai-compatible" }>, body: Body, ctl: AbortController): Promise<Streamed> {
  const res = await fetch(`${a.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${a.apiKey}` },
    body: JSON.stringify({
      model: a.model,
      stream: true,
      max_tokens: 800,
      ...a.extra,
      messages: [{ role: "system", content: `${SALTY_RULES}\n\nKNOWLEDGE\n${knowledgePack()}\n\n${contextNote(body)}` }, ...body.messages],
    }),
    signal: ctl.signal,
  });
  if (!res.ok || !res.body) {
    const detail = (await res.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 160);
    throw Object.assign(new Error(`${res.status} ${detail}`), { status: res.status });
  }
  // The answer has started: from here only the guest closing the chat stops it.
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  const stream = new AbortController();
  stream.signal.addEventListener("abort", () => ctl.abort());
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
          // Only the answer: reasoning models stream their thinking in a separate field, which guests never see.
          const delta = JSON.parse(payload)?.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta) yield delta;
        }
      }
    })(),
    abort: () => {
      reader.cancel().catch(() => {});
      stream.abort();
    },
  };
}

export function loader() {
  return text("Salty only answers POST requests.", 405);
}

/** Local development without an API key: a short scripted reply, streamed like the real thing. */
function demoStream(question: string) {
  const reply = `(Demo mode: add GEMINI_API_KEY, GROQ_API_KEY or ANTHROPIC_API_KEY to talk to the real Salty.) You asked: "${question.slice(0, 120)}". Try the Zaatar White Fish Tiradito ($24) and a Salmon Handroll ($11), or [book a counter seat](/book?seating=counter). 🐟`;
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
