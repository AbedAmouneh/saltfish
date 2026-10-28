import { useEffect, useState } from "react";
import { getBranch } from "~/content";
import { useI18n } from "~/i18n";
import { PERIODS, type GameId, type LeaderRow, type Period } from "~/lib/games";

export function Leaderboard({
  game,
  branch,
  refreshKey = 0,
  highlight,
}: {
  game: GameId;
  branch?: "naccache" | "faqra";
  refreshKey?: number;
  highlight?: string;
}) {
  const { t, locale } = useI18n();
  const [period, setPeriod] = useState<Period>("tonight");
  const [rows, setRows] = useState<LeaderRow[] | null>(null);

  useEffect(() => {
    let alive = true;
    setRows(null);
    const q = new URLSearchParams({ game, period, ...(branch ? { branch } : {}) });
    fetch(`/api/scores?${q}`)
      .then((r) => r.json() as Promise<{ rows: LeaderRow[] }>)
      .then((d) => alive && setRows(d.rows))
      .catch(() => alive && setRows([]));
    return () => {
      alive = false;
    };
  }, [game, period, branch, refreshKey]);

  return (
    <section className="grid gap-3" aria-label={t.play.leaderboard}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="eyebrow">{branch ? `${t.play.leaderboard} · ${getBranch(branch).short[locale]}` : t.play.leaderboard}</h2>
        <div className="flex gap-1" role="group" aria-label={t.play.leaderboard}>
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={period === p}
              onClick={() => setPeriod(p)}
              className={`min-h-9 rounded-full px-3 py-2 text-xs font-bold ${period === p ? "bg-cream text-night" : "text-sand hover:text-cream"}`}
            >
              {t.play.periods[p]}
            </button>
          ))}
        </div>
      </div>
      {rows === null ? (
        <ol className="grid gap-1.5" aria-busy="true">
          {Array.from({ length: 5 }, (_, i) => (
            <li key={i} className="h-10 animate-pulse rounded-xl bg-coal" />
          ))}
        </ol>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-5 text-center text-sm text-sand">{t.play.empty}</p>
      ) : (
        <ol className="grid gap-1.5">
          {rows.map((r, i) => (
            <li
              key={`${r.nickname}-${r.at}`}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 ${highlight === r.at ? "bg-amber text-night" : i === 0 ? "bg-ember" : "bg-coal"}`}
            >
              <span className="w-6 font-display text-xl font-[800] tabular-nums">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate font-semibold" dir="auto">
                {r.nickname}
              </span>
              {r.tableNo ? <span className={`text-xs ${highlight === r.at ? "text-night/70" : "text-dusk"}`}>{t.play.table(r.tableNo)}</span> : null}
              <span className="font-display text-xl font-[800] tabular-nums">{r.score}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
