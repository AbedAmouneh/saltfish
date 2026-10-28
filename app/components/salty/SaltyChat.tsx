import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { useI18n } from "~/i18n";
import { SaltyMascot } from "./SaltyMascot";

type Msg = { role: "user" | "assistant"; content: string };
type Props = { branch?: "naccache" | "faqra"; table?: number; onClose?: () => void; variant: "panel" | "full" };

const ALLOWED = /^\/(menu(\/drinks)?|naccache|faqra|events|story|book)(\?[\w=&-]*)?$/;

/** Renders Salty's replies: short lists, **bold** and links to site pages only. */
function RichText({ text }: { text: string }) {
  const { href } = useI18n();
  const inline = (line: string, key: string): ReactNode[] => {
    const parts: ReactNode[] = [];
    const re = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g;
    let last = 0;
    let m: RegExpExecArray | null;
    let i = 0;
    while ((m = re.exec(line))) {
      if (m.index > last) parts.push(line.slice(last, m.index));
      if (m[1] && m[2]) {
        const [path, query = ""] = m[2].split("?");
        parts.push(
          ALLOWED.test(m[2]) ? (
            <Link key={`${key}-${i++}`} to={`${href(path!)}${query ? `?${query}` : ""}`} className="font-semibold text-amber underline">
              {m[1]}
            </Link>
          ) : (
            m[1]
          ),
        );
      } else if (m[3]) parts.push(<strong key={`${key}-${i++}`}>{m[3]}</strong>);
      last = m.index + m[0].length;
    }
    if (last < line.length) parts.push(line.slice(last));
    return parts;
  };
  const lines = text.split("\n");
  const out: ReactNode[] = [];
  let list: ReactNode[] = [];
  const flush = (k: number) => {
    if (list.length)
      out.push(
        <ul key={`ul-${k}`} className="my-1 grid list-disc gap-1 ps-5">
          {list}
        </ul>,
      );
    list = [];
  };
  lines.forEach((l, k) => {
    const bullet = l.match(/^\s*[-•]\s+(.*)/);
    if (bullet) list.push(<li key={k}>{inline(bullet[1]!, `l${k}`)}</li>);
    else {
      flush(k);
      if (l.trim()) out.push(<p key={k}>{inline(l, `p${k}`)}</p>);
    }
  });
  flush(lines.length);
  return <div className="grid gap-2">{out}</div>;
}

export function SaltyChat({ branch, table, onClose, variant }: Props) {
  const { t, locale } = useI18n();
  const storageKey = `sf-salty:${branch ?? "site"}:${table ?? 0}`;
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Opening the floating panel puts the cursor straight in the message box
  useEffect(() => {
    if (variant === "panel") inputRef.current?.focus();
  }, [variant]);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) setMessages(JSON.parse(saved) as Msg[]);
    } catch {
      /* no storage */
    }
  }, [storageKey]);
  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(messages.slice(-16)));
    } catch {
      /* ignore */
    }
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, storageKey]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setNotice(null);
    setInput("");
    const history: Msg[] = [...messages, { role: "user", content: q }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setBusy(true);
    try {
      const res = await fetch("/api/salty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-12), locale, branch, table }),
      });
      if (!res.ok || !res.body) throw new Error(res.status === 429 ? "rate" : "http");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages([...history, { role: "assistant", content: acc }]);
      }
      if (!acc.trim()) throw new Error("empty");
    } catch (e) {
      setMessages(history.slice(0, -1));
      setInput(q);
      setNotice((e as Error).message === "rate" ? t.salty.rateLimited : t.salty.error);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  const suggestions = table ? t.salty.suggestionsTable : t.salty.suggestions;

  return (
    <section
      aria-label={t.salty.open}
      className={`flex flex-col bg-night ${variant === "panel" ? "h-full overflow-hidden rounded-3xl border border-line shadow-2xl" : "h-[calc(100dvh-8.5rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))]"}`}
    >
      <header className="flex items-center gap-3 border-b border-line bg-coal px-4 py-3">
        <SaltyMascot className="h-9 w-12 shrink-0" />
        <div className="grid">
          <h2 className="font-display text-xl font-[800] uppercase">Salty</h2>
          <p className="text-xs text-dusk">{t.salty.subtitle}</p>
        </div>
        <div className="ms-auto flex items-center gap-1">
          {messages.length ? (
            <button type="button" onClick={() => setMessages([])} className="rounded-full px-3 py-1.5 text-xs font-semibold text-sand hover:text-cream">
              {t.salty.reset}
            </button>
          ) : null}
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="grid size-9 place-items-center rounded-full text-sand hover:bg-ember hover:text-cream"
              aria-label={t.salty.close}
            >
              <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          ) : null}
        </div>
      </header>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite" aria-busy={busy}>
        <div className="max-w-[88%] rounded-2xl rounded-ss-md border border-line bg-coal px-4 py-3 text-[0.95rem]">{t.salty.greeting}</div>
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="ms-auto max-w-[85%] rounded-2xl rounded-se-md bg-amber px-4 py-3 text-[0.95rem] text-night">
              {m.content}
            </div>
          ) : (
            <div key={i} className="max-w-[88%] rounded-2xl rounded-ss-md border border-line bg-coal px-4 py-3 text-[0.95rem] leading-relaxed">
              {m.content ? <RichText text={m.content} /> : <span className="animate-pulse text-sand">{t.salty.thinking}</span>}
            </div>
          ),
        )}
        {!messages.length ? (
          <div className="flex flex-wrap gap-2 pt-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded-full border border-line px-3.5 py-2 text-sm text-sand hover:border-amber hover:text-cream"
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}
        {notice ? (
          <p role="alert" className="text-sm font-semibold text-[#ff8a7e]">
            {notice}
          </p>
        ) : null}
      </div>

      <form
        className="border-t border-line bg-coal p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <div className="flex items-end gap-2">
          <label htmlFor={`${storageKey}-input`} className="sr-only">
            {t.salty.placeholder}
          </label>
          <textarea
            id={`${storageKey}-input`}
            ref={inputRef}
            rows={1}
            maxLength={800}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            placeholder={t.salty.placeholder}
            className="field max-h-32 min-h-11 resize-none !rounded-2xl"
          />
          <button type="submit" disabled={busy || !input.trim()} className="btn btn-primary !min-h-11 !px-4 disabled:opacity-50" aria-label={t.salty.send}>
            <svg viewBox="0 0 24 24" className="size-5 rtl:-scale-x-100" aria-hidden="true">
              <path d="M4 12h14m-5-6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <p className="mt-2 text-[0.7rem] text-dusk">{t.salty.disclaimer}</p>
      </form>
    </section>
  );
}

export default SaltyChat;
