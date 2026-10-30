import { Link } from "react-router";
import { branches, site } from "~/content";
import { pick, useI18n } from "~/i18n";
import { telHref } from "~/lib/contact";
import { Arrow } from "./ui";
import { CollabLogo, VOXIRE_URL, VoxireWordmark } from "./Voxire";

export function SiteFooter() {
  const { t, locale, href } = useI18n();
  const year = new Date().getFullYear();
  return (
    <footer className="relative mt-24 border-t border-line bg-coal">
      <div className="tile-pattern h-3" aria-hidden="true" />
      <div className="gutter container-x grid gap-12 py-16 md:grid-cols-3 xl:grid-cols-[1.3fr_1fr_1fr_1fr]">
        {/* Tablets and laptops: the brand block gets its own row so the Saltfish × Voxire lockup stays on one line */}
        <div className="grid content-start gap-5 md:col-span-3 xl:col-span-1">
          <CollabLogo homeHref={href("/")} className="max-w-full flex-wrap justify-self-start text-3xl text-cream xl:text-4xl" voxireClassName="h-[1.05em]" />
          <p className="max-w-xs text-sand">{t.common.footer.tagline}</p>
        </div>

        {branches.map((b) => (
          <div key={b.id} className="grid content-start gap-3 text-sm">
            <h2 className="eyebrow">{pick(b.short, locale)}</h2>
            <p className="text-sand">{pick(b.address.display, locale)}</p>
            <p className="text-sand">
              {t.common.openDaily}, {t.common.hoursShort}
            </p>
            <ul className="grid">
              {b.phones.map((p) => (
                <li key={p}>
                  <a href={telHref(p)} className="inline-block py-1.5 font-semibold text-cream tabular-nums hover:text-amber" dir="ltr">
                    {p}
                  </a>
                </li>
              ))}
            </ul>
            <Link to={href(`/${b.id}`)} className="inline-flex items-center gap-1 justify-self-start py-1.5 font-semibold text-amber hover:underline">
              {t.branch.eyebrow} <Arrow />
            </Link>
          </div>
        ))}

        <div className="grid content-start gap-3 text-sm">
          <h2 className="eyebrow">{t.common.footer.explore}</h2>
          <ul className="grid">
            {[
              ["/menu", t.common.nav.menu],
              ["/menu/drinks", t.menu.drinksTitle],
              ["/events", t.common.nav.events],
              ["/story", t.common.nav.story],
              ["/play", t.common.nav.play],
              ["/book", t.common.nav.book],
            ].map(([to, label]) => (
              <li key={to}>
                <Link to={href(to!)} className="inline-block py-1.5 text-sand hover:text-cream">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <h2 className="eyebrow mt-4">{t.common.footer.follow}</h2>
          <ul className="flex gap-3">
            <li>
              <a href={site.instagram} target="_blank" rel="noopener" className="inline-block py-2 font-semibold text-cream hover:text-amber">
                {t.common.instagram}
              </a>
            </li>
            <li>
              <a href={site.spotifyPlaylist} target="_blank" rel="noopener" className="inline-block py-2 font-semibold text-cream hover:text-amber">
                Spotify
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="gutter container-x flex flex-wrap justify-between gap-3 border-t border-line py-6 text-xs text-dusk">
        <p>
          © {year} {site.name}. {t.common.footer.rights}
        </p>
      </div>
      {/* Extra bottom room so the floating "Ask Salty" button never covers the credit */}
      <div className="gutter container-x flex justify-center pt-2 pb-28 text-xs text-dusk md:pb-24">
        <a href={VOXIRE_URL} target="_blank" rel="noopener" className="inline-flex items-center gap-2 py-2 hover:text-cream">
          {t.common.footer.madeBy}
          <VoxireWordmark className="h-6" />
        </a>
      </div>
    </footer>
  );
}
