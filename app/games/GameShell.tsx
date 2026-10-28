import { useEffect, useRef, useState, type ReactNode } from "react";
import { useI18n } from "~/i18n";
import type { GameId } from "~/lib/games";
import { Leaderboard } from "./Leaderboard";

export type GameContext = { branch?: "naccache" | "faqra"; table?: number };
export type GameProps = { onGameOver: (score: number) => void } & GameContext;

type Phase = "ready" | "playing" | "over";
const NICK_KEY = "sf-nickname";

/**
 * Intro → play → score screen with nickname, leaderboard and share,
 * shared by all three games.
 */
export function GameShell({ game, context, children }: { game: GameId; context: GameContext; children: (p: GameProps) => ReactNode }) {
  const { t } = useI18n();
  const info = t.play.games[game];
  const [phase, setPhase] = useState<Phase>("ready");
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [boardKey, setBoardKey] = useState(0);
  const ticket = useRef<Promise<string | null>>(Promise.resolve(null));

  useEffect(() => {
    try {
      setBest(Number(localStorage.getItem(`sf-best:${game}`) ?? 0));
    } catch {
      /* ignore */
    }
  }, [game]);

  const start = () => {
    ticket.current = fetch(`/api/scores?start=${game}`)
      .then((r) => r.json() as Promise<{ ticket: string }>)
      .then((d) => d.ticket)
      .catch(() => null);
    setRound((r) => r + 1);
    setPhase("playing");
  };

  const over = (s: number) => {
    setScore(s);
    setPhase("over");
    if (s > best) {
      setBest(s);
      try {
        localStorage.setItem(`sf-best:${game}`, String(s));
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <div className="grid gap-6">
      {phase === "playing" ? (
        <div key={round}>{children({ onGameOver: over, ...context })}</div>
      ) : phase === "ready" ? (
        <div className="grid gap-5 rounded-3xl border border-line bg-coal p-6">
          <p className="text-sand">{info.how}</p>
          {best ? (
            <p className="text-sm text-dusk">
              {t.play.score}: <b className="text-cream">{best}</b>
            </p>
          ) : null}
          <button type="button" onClick={start} className="btn btn-primary justify-self-start !px-8 text-lg">
            {t.play.start}
          </button>
        </div>
      ) : (
        <ScoreScreen
          game={game}
          score={score}
          best={best}
          context={context}
          ticket={ticket.current}
          onAgain={start}
          onSaved={() => setBoardKey((k) => k + 1)}
        />
      )}
      {phase !== "playing" ? <Leaderboard game={game} branch={context.branch} refreshKey={boardKey} /> : null}
    </div>
  );
}

function ScoreScreen({
  game,
  score,
  best,
  context,
  ticket,
  onAgain,
  onSaved,
}: {
  game: GameId;
  score: number;
  best: number;
  context: GameContext;
  ticket: Promise<string | null>;
  onAgain: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [nick, setNick] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const name = t.play.games[game].name;

  useEffect(() => {
    try {
      setNick(localStorage.getItem(NICK_KEY) ?? "");
    } catch {
      /* ignore */
    }
  }, []);

  async function save() {
    setState("saving");
    try {
      localStorage.setItem(NICK_KEY, nick.trim());
    } catch {
      /* ignore */
    }
    try {
      const tk = await ticket;
      if (!tk) throw new Error("ticket");
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game, score, nickname: nick.trim(), ticket: tk, branch: context.branch, table: context.table }),
      });
      const d = (await res.json()) as { ok?: boolean; rank?: number; error?: string };
      if (!res.ok || !d.ok) {
        setState("error");
        setMsg(d.error === "nickname" ? t.play.nicknameError : t.play.saveError);
        return;
      }
      setState("saved");
      setMsg(t.play.saved(d.rank ?? 1));
      onSaved();
    } catch {
      setState("error");
      setMsg(t.play.saveError);
    }
  }

  async function share() {
    const text = t.play.shareText(name, score);
    const url = `${window.location.origin}${window.location.pathname.replace(/\/t\/.*$/, "/play")}`;
    try {
      if (navigator.share) await navigator.share({ text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setCopied(true);
      }
    } catch {
      /* cancelled */
    }
  }

  return (
    <div className="grid gap-5 rounded-3xl border border-amber/50 bg-coal p-6" aria-live="polite">
      <p className="eyebrow">{t.play.gameOver}</p>
      <p className="display text-8xl text-amber tabular-nums">{score}</p>
      {best > 0 ? <p className="-mt-3 text-sm text-dusk">★ {best}</p> : null}
      {state === "saved" ? (
        <p className="font-semibold text-leaf">{msg}</p>
      ) : score > 0 ? (
        <form
          className="grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (state !== "saving") void save();
          }}
        >
          <label htmlFor={`nick-${game}`} className="text-sm font-semibold">
            {t.play.nicknameLabel}
          </label>
          <div className="flex gap-2">
            <input
              id={`nick-${game}`}
              value={nick}
              onChange={(e) => setNick(e.target.value)}
              maxLength={16}
              minLength={2}
              required
              dir="auto"
              placeholder={t.play.nicknamePlaceholder}
              className="field"
            />
            <button className="btn btn-primary shrink-0" disabled={state === "saving" || nick.trim().length < 2}>
              {state === "saving" ? t.play.saving : t.play.save}
            </button>
          </div>
          {state === "error" ? (
            <p role="alert" className="text-sm font-semibold text-[#ff8a7e]">
              {msg}
            </p>
          ) : null}
        </form>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={onAgain} className="btn btn-primary">
          {t.play.again}
        </button>
        <button type="button" onClick={share} className="btn btn-ghost">
          {copied ? t.play.copied : t.play.share}
        </button>
      </div>
    </div>
  );
}
