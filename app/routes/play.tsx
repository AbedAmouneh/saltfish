import { Link, type MetaFunction } from "react-router";
import { Arrow, PageHero } from "~/components/ui";
import { GameArt } from "~/games/GameArt";
import { getDict, useI18n } from "~/i18n";
import { GAMES } from "~/lib/games";
import { localeFromPath } from "~/lib/locale";
import { breadcrumbLd, pageMeta } from "~/lib/seo";

export const meta: MetaFunction = ({ location }) => {
  const t = getDict(localeFromPath(location.pathname));
  return pageMeta({
    pathname: location.pathname,
    title: t.play.metaTitle,
    description: t.play.metaDescription,
    og: "play",
    jsonLd: [
      breadcrumbLd(location.pathname, [
        { name: "Saltfish", path: "/" },
        { name: t.play.title, path: "/play" },
      ]),
    ],
  });
};

export default function PlayHub() {
  const { t, href } = useI18n();
  return (
    <>
      <PageHero eyebrow={t.play.eyebrow} title={t.play.title} sub={t.play.sub} />
      <ul className="gutter container-x grid gap-5 md:grid-cols-3">
        {GAMES.map((g) => (
          <li key={g}>
            <Link to={href(`/play/${g}`)} className="group grid overflow-hidden rounded-3xl border border-line bg-coal transition-colors hover:border-amber">
              <GameArt game={g} className="aspect-[4/3] transition-transform duration-500 group-hover:scale-[1.03]" />
              <div className="grid gap-2 p-6">
                <h2 className="display text-4xl" lang="en">
                  {t.play.games[g].name}
                </h2>
                <p className="text-sand">{t.play.games[g].tagline}</p>
                <span className="mt-2 inline-flex items-center gap-1 font-semibold text-amber">
                  {t.play.play} <Arrow />
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
