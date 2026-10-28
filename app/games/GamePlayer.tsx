import { lazy, Suspense } from "react";
import { useI18n } from "~/i18n";
import type { GameId } from "~/lib/games";
import { GameShell, type GameContext } from "./GameShell";

const GAMES = {
  "handroll-rush": lazy(() => import("./HandrollRush")),
  catch: lazy(() => import("./CatchOfTheDay")),
  trivia: lazy(() => import("./SaltOrFish")),
} as const;

/** One game with its intro, score screen and leaderboard. Game code loads on demand. */
export function GamePlayer({ game, context = {} }: { game: GameId; context?: GameContext }) {
  const { t } = useI18n();
  const Game = GAMES[game];
  return (
    <GameShell game={game} context={context}>
      {(props) => (
        <Suspense
          fallback={<div className="mx-auto grid aspect-[3/4] w-full max-w-[420px] place-items-center rounded-3xl bg-coal text-sand">{t.salty.thinking}</div>}
        >
          <Game {...props} />
        </Suspense>
      )}
    </GameShell>
  );
}
