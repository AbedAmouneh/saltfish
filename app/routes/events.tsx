import { useEffect, useState } from "react";
import type { MetaFunction } from "react-router";
import { Photo } from "~/components/Photo";
import { PageHero } from "~/components/ui";
import { events, getBranch, site } from "~/content";
import type { OneOffEvent } from "~/content/schema";
import { formatDate, formatPrice, formatTime, getDict, pick, useI18n } from "~/i18n";
import { ritualWhen } from "~/lib/events";
import { localeFromPath } from "~/lib/locale";
import { breadcrumbLd, eventsLd, pageMeta } from "~/lib/seo";
import { beirutToday, icsDataUrl } from "~/lib/time";

export const meta: MetaFunction = ({ location }) => {
  const locale = localeFromPath(location.pathname);
  const t = getDict(locale);
  return pageMeta({
    pathname: location.pathname,
    title: t.events.metaTitle,
    description: t.events.metaDescription,
    og: "events",
    jsonLd: [
      ...eventsLd(locale),
      breadcrumbLd(location.pathname, [
        { name: "Saltfish", path: "/" },
        { name: t.events.title, path: "/events" },
      ]),
    ],
  });
};

function icsHref(e: OneOffEvent, location: string) {
  return icsDataUrl({
    uid: `${e.id}@saltfish`,
    stamp: new Date(`${__BUILD_DATE__}T00:00:00Z`),
    date: e.date,
    time: e.start,
    minutes: 240,
    summary: `${e.title} at Saltfish`,
    location,
    description: e.summary.en,
  });
}

export default function EventsPage() {
  const { t, locale } = useI18n();
  // Start from the build date so server and browser render the same list,
  // then switch to the real date (hides events that passed since the last deploy).
  const [today, setToday] = useState(__BUILD_DATE__);
  useEffect(() => setToday(beirutToday()), []);
  const upcoming = events.oneOff.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const branchLabel = (id: "naccache" | "faqra" | "both") => (id === "both" ? t.events.both : pick(getBranch(id).short, locale));

  return (
    <>
      <PageHero eyebrow={t.events.eyebrow} title={t.events.title} sub={t.events.sub} photo="packed-room" />

      {upcoming.length ? (
        <section className="gutter container-x pb-16" aria-labelledby="upcoming">
          <h2 id="upcoming" className="eyebrow mb-6">
            {t.events.upcoming}
          </h2>
          <ul className="grid gap-5">
            {upcoming.map((e) => {
              const venue = e.branch === "both" ? t.events.both : getBranch(e.branch).name;
              return (
                <li key={e.id} className="grid overflow-hidden rounded-3xl border border-amber/40 bg-coal md:grid-cols-[18rem_1fr]">
                  <Photo slug={e.photo} sizes="(min-width: 768px) 18rem, 90vw" decorative imgClassName="h-56 w-full object-cover md:h-full" />
                  <div className="grid content-center gap-3 p-6 md:p-8">
                    <p className="eyebrow flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span>
                        {formatDate(e.date, locale)} · {e.start ? formatTime(e.start, locale) : t.events.tba}
                      </span>
                      {!e.confirmed ? <span className="rounded-full border border-sun/60 px-2 py-0.5 text-sun normal-case">{t.events.tentative}</span> : null}
                    </p>
                    <h3 className="display text-5xl" lang="en">
                      {e.title}
                    </h3>
                    <p className="text-sand">{pick(e.summary, locale)}</p>
                    <p className="text-sm font-semibold">{branchLabel(e.branch)}</p>
                    <a href={icsHref(e, venue)} download={`${e.id}.ics`} className="btn btn-ghost justify-self-start">
                      {t.events.addToCalendar}
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="gutter container-x" aria-labelledby="weekly">
        <h2 id="weekly" className="display text-[clamp(2.6rem,6vw,4.5rem)]">
          {t.events.weekly}
        </h2>
        <ul className="mt-10 grid gap-5 md:grid-cols-2">
          {events.rituals.map((r) => (
            <li key={r.id} className="group grid overflow-hidden rounded-3xl border border-line bg-coal">
              <Photo
                slug={r.photo}
                sizes="(min-width: 1440px) 620px, (min-width: 768px) 46vw, 90vw"
                decorative
                imgClassName="aspect-[16/9] w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              />
              <div className="grid content-start gap-3 p-6 md:p-8">
                <p className="eyebrow">{ritualWhen(r, t, locale)}</p>
                <h3 className="display text-4xl md:text-5xl" lang="en">
                  {r.title}
                </h3>
                <p className="text-sand">{pick(r.summary, locale)}</p>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="rounded-full border border-line px-3 py-1 font-semibold">{branchLabel(r.branch)}</span>
                  {r.price !== undefined ? (
                    <span className="rounded-full bg-amber px-3 py-1 font-bold text-night" dir="ltr">
                      {formatPrice(r.price)}
                    </span>
                  ) : null}
                </div>
                {r.note ? <p className="text-sm text-dusk">{pick(r.note, locale)}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="gutter container-x pt-24" aria-labelledby="playlist">
        <div className="grid items-center gap-8 rounded-3xl border border-line bg-coal p-6 md:grid-cols-[1fr_1.2fr] md:p-10">
          <div className="grid gap-4">
            <h2 id="playlist" className="display text-5xl">
              {t.events.playlistTitle}
            </h2>
            <p className="text-sand">{t.events.playlistBody}</p>
            <a href={site.spotifyPlaylist} target="_blank" rel="noopener" className="btn btn-ghost justify-self-start">
              Spotify
            </a>
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
