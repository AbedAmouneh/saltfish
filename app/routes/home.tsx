import { Link, type MetaFunction } from "react-router";
import { Photo } from "~/components/Photo";
import { Arrow, BranchCard, DishCard, SectionHeading, Ticker } from "~/components/ui";
import { branches, events, menu, site } from "~/content";
import { getDict, pick, useI18n } from "~/i18n";
import { localeFromPath } from "~/lib/locale";
import { organizationLd, pageMeta, restaurantLd, websiteLd } from "~/lib/seo";
import { ritualWhen } from "~/lib/events";

export const meta: MetaFunction = ({ location }) => {
  const locale = localeFromPath(location.pathname);
  const t = getDict(locale);
  return pageMeta({
    pathname: location.pathname,
    title: t.home.metaTitle,
    description: t.home.metaDescription,
    og: "home",
    jsonLd: [organizationLd(locale), websiteLd(locale), ...branches.map((b) => restaurantLd(b, locale))],
  });
};

/** Hand-picked signatures, in this order, from menu.json. */
const SIGNATURES = [
  "zaatar-white-fish-tiradito",
  "caviar-fish-burger",
  "torched-salmon-belly-nigiri",
  "crudo-passion-fruit-martini",
  "lobster-roll",
  "mediter-asian-donburi",
];
const INSTAGRAM_STRIP = ["oysters-red-tile", "tomatini", "the-crew-counter", "salmon-sashimi", "wagyu-grill", "faqra-cocktails"];

export default function Home() {
  const { t, locale, href } = useI18n();
  const items = menu.categories.flatMap((c) => c.items);
  const signatures = SIGNATURES.map((id) => items.find((i) => i.id === id)).filter((i): i is NonNullable<typeof i> => !!i);

  return (
    <>
      {/* HERO */}
      <section className="relative isolate flex min-h-[min(100svh,58rem)] items-end overflow-hidden pt-28 pb-12 md:pb-16">
        <Photo
          slug="naccache-dining-room"
          sizes="100vw"
          priority
          className="absolute inset-0 -z-20"
          imgClassName="size-full object-cover object-[60%_50%] opacity-70 saturate-[1.15]"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#120b08_6%,rgba(18,11,8,.72)_45%,rgba(18,11,8,.15)_100%),linear-gradient(0deg,#120b08_0%,transparent_40%)] rtl:bg-[linear-gradient(270deg,#120b08_6%,rgba(18,11,8,.72)_45%,rgba(18,11,8,.15)_100%),linear-gradient(0deg,#120b08_0%,transparent_40%)]" />
        <div className="grain absolute inset-0 -z-10" aria-hidden="true" />
        <div className="gutter container-x grid w-full gap-6">
          <p className="eyebrow animate-rise">{t.home.eyebrow}</p>
          <h1 className="display animate-rise max-w-[14ch] text-[clamp(3.5rem,11vw,9.5rem)] [animation-delay:80ms]">
            {t.home.titleA} <span className="text-amber">{t.home.titleB}</span>
          </h1>
          <p className="animate-rise max-w-[52ch] text-lg text-sand [animation-delay:160ms] md:text-xl">{t.home.sub}</p>
          <div className="animate-rise flex flex-wrap gap-3 [animation-delay:240ms]">
            <Link to={href("/book")} className="btn btn-primary">
              {t.common.bookTable}
            </Link>
            <Link to={href("/menu")} className="btn btn-ghost">
              {t.common.seeMenu} <Arrow />
            </Link>
          </div>
          <ul className="animate-rise mt-4 flex flex-wrap items-center gap-x-8 text-sm text-sand [animation-delay:320ms]">
            {branches.map((b) => (
              <li key={b.id}>
                <Link to={href(`/${b.id}`)} className="inline-flex min-h-10 items-center hover:text-cream">
                  <span className="font-bold text-cream">{pick(b.short, locale)}</span> · {pick(b.venue, locale)}
                </Link>
              </li>
            ))}
            <li>
              {t.common.openDaily} · {t.common.hoursShort}
            </li>
          </ul>
        </div>
      </section>

      <Ticker items={t.home.ticker} />

      {/* SIGNATURES */}
      <section className="gutter container-x py-24 md:py-32" aria-labelledby="signatures">
        <SectionHeading
          id="signatures"
          eyebrow={t.home.signatures.eyebrow}
          title={t.home.signatures.title}
          sub={t.home.signatures.sub}
          action={
            <Link to={href("/menu")} className="btn btn-ghost">
              {t.home.signatures.cta} <Arrow />
            </Link>
          }
        />
        <ul className="mt-12 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3">
          {signatures.map((item) => (
            <li key={item.id}>
              <DishCard item={item} href={`${href("/menu")}#${item.id}`} />
            </li>
          ))}
        </ul>
      </section>

      {/* COUNTER */}
      <section className="relative isolate overflow-hidden" aria-labelledby="counter">
        <div className="tile-pattern absolute inset-0 -z-10 opacity-90" aria-hidden="true" />
        <div className="gutter container-x grid items-center gap-10 py-20 md:grid-cols-2 md:py-28">
          <div className="order-2 grid gap-5 md:order-1">
            <p className="eyebrow !text-sun">{t.home.counter.eyebrow}</p>
            <h2 id="counter" className="display text-[clamp(2.8rem,6.5vw,5.5rem)] text-cream">
              {t.home.counter.title}
            </h2>
            <p className="max-w-[48ch] text-lg text-[#ffe7d6]">{t.home.counter.body}</p>
            <Link to={`${href("/book")}?seating=counter`} className="btn justify-self-start bg-night text-cream hover:bg-black">
              {t.home.counter.cta} <Arrow />
            </Link>
          </div>
          <div className="relative order-1 md:order-2">
            <Photo
              slug="handrolls-tile-counter"
              sizes="(min-width: 768px) 45vw, 90vw"
              imgClassName="aspect-[4/5] w-full rounded-3xl object-cover shadow-[0_30px_60px_-20px_rgba(0,0,0,.6)]"
            />
            <Photo
              slug="handroll-slate"
              sizes="(min-width: 768px) 18vw, 40vw"
              className="absolute -bottom-8 -start-6 hidden w-[42%] md:block"
              imgClassName="aspect-square w-full -rotate-6 rounded-2xl border-4 border-cream object-cover shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* BRANCHES */}
      <section className="gutter container-x py-24 md:py-32" aria-labelledby="branches">
        <SectionHeading id="branches" eyebrow={t.home.branches.eyebrow} title={t.home.branches.title} />
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {branches.map((b) => (
            <BranchCard key={b.id} branch={b} />
          ))}
        </div>
      </section>

      {/* RITUALS */}
      <section className="border-y border-line bg-coal" aria-labelledby="rituals">
        <div className="gutter container-x py-24 md:py-28">
          <SectionHeading
            id="rituals"
            eyebrow={t.home.rituals.eyebrow}
            title={t.home.rituals.title}
            action={
              <Link to={href("/events")} className="btn btn-ghost">
                {t.home.rituals.cta} <Arrow />
              </Link>
            }
          />
          <ul className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {events.rituals.map((r) => (
              <li key={r.id} className="grid content-start gap-3 bg-coal p-6">
                <p className="eyebrow">{ritualWhen(r, t, locale)}</p>
                <h3 className="display text-3xl" lang="en">
                  {r.title}
                </h3>
                <p className="text-sm text-sand">{pick(r.summary, locale)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* STORY */}
      <section className="gutter container-x grid items-center gap-12 py-24 md:grid-cols-[1fr_1.1fr] md:py-32" aria-labelledby="story">
        <Photo slug="the-crew-counter" sizes="(min-width: 768px) 45vw, 100vw" imgClassName="aspect-[4/5] w-full rounded-3xl object-cover" />
        <div className="grid gap-6">
          <p className="eyebrow">{t.home.story.eyebrow}</p>
          <h2 id="story" className="display text-[clamp(3rem,7vw,6rem)]">
            “{t.home.story.quote}”
          </h2>
          <p className="max-w-[52ch] text-lg text-sand">{t.home.story.body}</p>
          <Link to={href("/story")} className="btn btn-ghost justify-self-start">
            {t.home.story.cta} <Arrow />
          </Link>
        </div>
      </section>

      {/* INSTAGRAM */}
      <section className="gutter container-x" aria-labelledby="insta">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 id="insta" className="display text-4xl" dir="ltr">
            {t.home.insta.title}
          </h2>
          <a href={site.instagram} target="_blank" rel="noopener" className="inline-flex items-center gap-2 font-semibold text-amber hover:underline">
            {t.home.insta.cta} <Arrow />
          </a>
        </div>
        <ul className="mt-6 grid grid-cols-3 gap-2 md:grid-cols-6">
          {INSTAGRAM_STRIP.map((slug) => (
            <li key={slug}>
              <a href={site.instagram} target="_blank" rel="noopener" className="block overflow-hidden rounded-xl">
                <Photo
                  slug={slug}
                  sizes="(min-width: 768px) 16vw, 33vw"
                  imgClassName="aspect-square w-full object-cover transition-transform duration-500 hover:scale-105"
                />
              </a>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
