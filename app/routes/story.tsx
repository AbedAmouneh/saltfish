import { Link, type MetaFunction } from "react-router";
import { Photo } from "~/components/Photo";
import { Arrow, PageHero } from "~/components/ui";
import { site } from "~/content";
import { getDict, useI18n } from "~/i18n";
import { localeFromPath } from "~/lib/locale";
import { breadcrumbLd, organizationLd, pageMeta } from "~/lib/seo";

export const meta: MetaFunction = ({ location }) => {
  const locale = localeFromPath(location.pathname);
  const t = getDict(locale);
  return pageMeta({
    pathname: location.pathname,
    title: t.story.metaTitle,
    description: t.story.metaDescription,
    og: "story",
    jsonLd: [
      organizationLd(locale),
      breadcrumbLd(location.pathname, [
        { name: "Saltfish", path: "/" },
        { name: t.story.eyebrow, path: "/story" },
      ]),
    ],
  });
};

export default function StoryPage() {
  const { t, href } = useI18n();
  return (
    <>
      <PageHero eyebrow={t.story.eyebrow} title={t.story.title} photo="neon-sign" />

      <section className="gutter container-x grid gap-12 md:grid-cols-[1.2fr_1fr] md:items-center">
        <p className="text-[clamp(1.35rem,2.6vw,2rem)] leading-snug font-medium text-cream">{t.story.intro}</p>
        <Photo slug="zaatar-tiradito" sizes="(min-width: 768px) 40vw, 100vw" imgClassName="aspect-[4/5] w-full rounded-3xl object-cover" />
      </section>

      {/* Timeline */}
      <section className="gutter container-x py-24 md:py-32" aria-labelledby="timeline">
        <h2 id="timeline" className="display text-[clamp(2.6rem,6vw,4.5rem)]">
          {t.story.timelineTitle}
        </h2>
        <ol className="mt-12 grid gap-0 border-s border-line">
          {t.story.timeline.map((step, i) => (
            <li key={i} className="relative grid gap-2 ps-8 pb-12 last:pb-0 md:grid-cols-[10rem_1fr] md:gap-8">
              <span className="absolute -start-[7px] top-2 size-3.5 rounded-full border-2 border-night bg-amber" aria-hidden="true" />
              <p className="display text-5xl text-amber">{step.year}</p>
              <div className="grid gap-2">
                <h3 className="text-2xl font-bold">{step.title}</h3>
                <p className="max-w-[60ch] text-sand">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Counter */}
      <section className="relative isolate overflow-hidden">
        <div className="tile-pattern absolute inset-0 -z-10" aria-hidden="true" />
        <div className="gutter container-x grid items-center gap-10 py-20 md:grid-cols-2">
          <Photo slug="sake-handroll" sizes="(min-width: 768px) 45vw, 100vw" imgClassName="aspect-[4/5] w-full rounded-3xl object-cover shadow-2xl" />
          <div className="grid gap-5">
            <h2 className="display text-[clamp(2.6rem,6vw,4.75rem)]">{t.story.counterTitle}</h2>
            <p className="max-w-[48ch] text-lg text-[#ffe7d6]">{t.story.counterBody}</p>
            <Link to={`${href("/book")}?seating=counter`} className="btn justify-self-start bg-night text-cream hover:bg-black">
              {t.home.counter.cta} <Arrow />
            </Link>
          </div>
        </div>
      </section>

      {/* House rules */}
      <section className="gutter container-x py-24 md:py-32" aria-labelledby="rules">
        <h2 id="rules" className="display text-[clamp(2.6rem,6vw,4.5rem)]">
          {t.story.rulesTitle}
        </h2>
        <ol className="mt-10 grid gap-4 md:grid-cols-2">
          {t.story.rules.map((rule, i) => (
            <li key={i} className="flex gap-5 rounded-3xl border border-line bg-coal p-6">
              <span className="display text-5xl text-amber tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              <p className="self-center text-lg">{rule}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Crew */}
      <section className="gutter container-x grid items-center gap-10 md:grid-cols-[1fr_1.3fr]" aria-labelledby="crew">
        <div className="grid gap-4">
          <h2 id="crew" className="display text-[clamp(2.6rem,6vw,4.5rem)]">
            {t.story.crewTitle}
          </h2>
          <p className="max-w-[44ch] text-lg text-sand">{t.story.crewBody}</p>
          <a href={site.instagram} target="_blank" rel="noopener" className="inline-flex items-center gap-1 font-semibold text-amber hover:underline">
            {t.home.insta.cta} <Arrow />
          </a>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Photo slug="the-crew" sizes="(min-width: 768px) 28vw, 50vw" imgClassName="aspect-[4/5] w-full rounded-2xl object-cover" />
          <Photo slug="kitchen-motion" sizes="(min-width: 768px) 28vw, 50vw" imgClassName="aspect-[4/5] w-full rounded-2xl object-cover mt-10" />
        </div>
      </section>

      {/* Playlist */}
      <section className="gutter container-x pt-24" aria-labelledby="playlist">
        <div className="grid items-center gap-8 rounded-3xl border border-line bg-coal p-6 md:grid-cols-[1fr_1.2fr] md:p-10">
          <div className="grid gap-4">
            <h2 id="playlist" className="display text-5xl">
              {t.events.playlistTitle}
            </h2>
            <p className="text-sand">{t.events.playlistBody}</p>
          </div>
          <iframe
            title={t.events.playlistTitle}
            src={site.spotifyEmbed}
            loading="lazy"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            className="h-[352px] w-full rounded-2xl border-0"
          />
        </div>
      </section>
    </>
  );
}
