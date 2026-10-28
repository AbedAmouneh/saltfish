import { Link, useLocation, type MetaFunction } from "react-router";
import { Arrow } from "~/components/ui";
import { GamePlayer } from "~/games/GamePlayer";
import { getDict, useI18n } from "~/i18n";
import { GAMES, type GameId } from "~/lib/games";
import { localeFromPath, stripLocale } from "~/lib/locale";
import { breadcrumbLd, pageMeta } from "~/lib/seo";

const gameFromPath = (pathname: string): GameId => {
  const id = stripLocale(pathname).split("/")[2];
  return (GAMES as readonly string[]).includes(id ?? "") ? (id as GameId) : "handroll-rush";
};

export const meta: MetaFunction = ({ location }) => {
  const t = getDict(localeFromPath(location.pathname));
  const g = gameFromPath(location.pathname);
  const info = t.play.games[g];
  return pageMeta({
    pathname: location.pathname,
    title: `${info.name} | ${t.play.title} · Saltfish`,
    description: `${info.tagline} ${info.how}`,
    og: "play",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "VideoGame",
        name: info.name,
        description: info.tagline,
        gamePlatform: "Web browser",
        applicationCategory: "Game",
        operatingSystem: "Any",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        publisher: { "@type": "Organization", name: "Saltfish" },
      },
      breadcrumbLd(location.pathname, [
        { name: "Saltfish", path: "/" },
        { name: t.play.title, path: "/play" },
        { name: info.name, path: `/play/${g}` },
      ]),
    ],
  });
};

export default function PlayGame() {
  const { pathname } = useLocation();
  const { t, href } = useI18n();
  const g = gameFromPath(pathname);
  return (
    <section className="gutter container-x grid gap-8 pt-28 md:pt-36">
      <div className="grid gap-3">
        <Link to={href("/play")} className="-my-2 inline-flex items-center gap-1 justify-self-start py-3 text-sm font-semibold text-amber">
          <Arrow className="rotate-180" /> {t.play.allGames}
        </Link>
        <h1 className="display text-[clamp(3rem,9vw,6.5rem)]" lang="en">
          {t.play.games[g].name}
        </h1>
        <p className="max-w-[56ch] text-lg text-sand">{t.play.games[g].tagline}</p>
      </div>
      <div className="mx-auto w-full max-w-xl">
        <GamePlayer game={g} />
      </div>
    </section>
  );
}
