import { Link, useLocation, type MetaFunction } from "react-router";
import { Photo } from "~/components/Photo";
import { Arrow, HoursList } from "~/components/ui";
import { branches, getBranch } from "~/content";
import type { BranchId } from "~/content/schema";
import { getDict, pick, useI18n } from "~/i18n";
import { directionsHref, googleReviewsHref, mapEmbedSrc, telHref, whatsappHref } from "~/lib/contact";
import { localeFromPath, stripLocale } from "~/lib/locale";
import { breadcrumbLd, pageMeta, restaurantLd } from "~/lib/seo";

function branchFromPath(pathname: string): BranchId {
  return stripLocale(pathname).slice(1) === "faqra" ? "faqra" : "naccache";
}

export const meta: MetaFunction = ({ location }) => {
  const locale = localeFromPath(location.pathname);
  const t = getDict(locale);
  const b = getBranch(branchFromPath(location.pathname));
  const place = pick(b.short, locale);
  return pageMeta({
    pathname: location.pathname,
    title: t.branch.metaTitle(b.name),
    description: t.branch.metaDescription(
      b.id === "naccache" ? `${place} · ${pick(b.venue, locale)}` : place,
      `${t.common.openDaily}, ${t.common.hoursShort}`,
      b.phones[0]!,
    ),
    og: b.id,
    jsonLd: [
      restaurantLd(b, locale),
      breadcrumbLd(location.pathname, [
        { name: "Saltfish", path: "/" },
        { name: place, path: `/${b.id}` },
      ]),
    ],
  });
};

export default function BranchPage() {
  const { pathname } = useLocation();
  const { t, locale, href } = useI18n();
  const b = getBranch(branchFromPath(pathname));
  const other = branches.find((x) => x.id !== b.id)!;
  const place = pick(b.short, locale);

  return (
    <>
      <section className="relative isolate flex min-h-[min(88svh,46rem)] items-end overflow-hidden pt-28 pb-12">
        <Photo slug={b.photo} sizes="100vw" priority className="absolute inset-0 -z-20" imgClassName="size-full object-cover opacity-75" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(18,11,8,.25)_0%,rgba(18,11,8,.6)_50%,#120b08_100%)]" />
        <div className="gutter container-x grid w-full gap-4">
          <p className="eyebrow animate-rise">{pick(b.venue, locale)}</p>
          <h1 className="display animate-rise text-[clamp(4rem,14vw,11rem)] [animation-delay:80ms]">{place}</h1>
          <p className="animate-rise max-w-[56ch] text-lg text-sand [animation-delay:160ms] md:text-xl">{pick(b.blurb, locale)}</p>
          <div className="animate-rise flex flex-wrap gap-3 [animation-delay:240ms]">
            <Link to={`${href("/book")}?branch=${b.id}`} className="btn btn-primary">
              {t.branch.bookHere(place)}
            </Link>
            <a href={directionsHref(b)} target="_blank" rel="noopener" className="btn btn-ghost">
              {t.common.directions} <Arrow />
            </a>
          </div>
        </div>
      </section>

      {/* Practical info */}
      <section className="gutter container-x" aria-label={t.branch.eyebrow}>
        <div className="grid gap-px overflow-hidden rounded-3xl border border-line bg-line md:grid-cols-3">
          <div className="grid content-start gap-3 bg-coal p-6 md:p-8">
            <h2 className="eyebrow">{t.branch.address}</h2>
            <address className="text-lg not-italic">{pick(b.address.display, locale)}</address>
            {b.id === "faqra" ? <p className="text-xs text-dusk">{t.branch.toConfirm}</p> : null}
            <a
              href={directionsHref(b)}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1 justify-self-start py-2 font-semibold text-amber hover:underline"
            >
              {t.common.directions} <Arrow />
            </a>
          </div>
          <div className="grid content-start gap-3 bg-coal p-6 md:p-8">
            <h2 className="eyebrow">{t.branch.hours}</h2>
            <HoursList branch={b} />
          </div>
          <div className="grid content-start gap-3 bg-coal p-6 md:p-8">
            <h2 className="eyebrow">{t.branch.phones}</h2>
            <ul className="grid gap-1">
              {b.phones.map((p) => (
                <li key={p}>
                  <a href={telHref(p)} className="inline-block py-1 text-lg font-semibold tabular-nums hover:text-amber" dir="ltr">
                    {p}
                  </a>
                </li>
              ))}
            </ul>
            <a
              href={whatsappHref(b)}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1 justify-self-start py-2 font-semibold text-amber hover:underline"
            >
              {t.common.whatsapp} <Arrow />
            </a>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="gutter container-x pt-10">
        <ul className="flex flex-wrap gap-2">
          {b.highlights.map((h) => (
            <li key={h} className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-sand">
              {t.branch.highlights[h]}
            </li>
          ))}
        </ul>
      </section>

      {/* Seating */}
      <section className="gutter container-x py-20 md:py-28" aria-labelledby="seating">
        <h2 id="seating" className="display text-[clamp(2.6rem,6vw,4.5rem)]">
          {t.branch.seating}
        </h2>
        <ul className="mt-10 grid gap-5 md:grid-cols-3">
          {b.seating.map((s) => (
            <li key={s} className="grid content-start gap-3 rounded-3xl border border-line bg-coal p-6">
              <h3 className="display text-3xl text-amber">{t.branch.seatingTypes[s].title}</h3>
              <p className="text-sand">{t.branch.seatingTypes[s].body}</p>
              <Link
                to={`${href("/book")}?branch=${b.id}&seating=${s}`}
                className="mt-1 inline-flex min-h-10 items-center gap-1 justify-self-start text-sm font-semibold text-cream hover:text-amber"
              >
                {t.common.bookTable} <Arrow />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Gallery */}
      <section className="gutter container-x" aria-labelledby="gallery">
        <h2 id="gallery" className="eyebrow mb-6">
          {t.branch.gallery}
        </h2>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {b.gallery.map((slug) => (
            <li key={slug}>
              <Photo slug={slug} sizes="(min-width: 768px) 25vw, 50vw" imgClassName="aspect-[4/5] w-full rounded-2xl object-cover" />
            </li>
          ))}
        </ul>
      </section>

      {/* Map */}
      <section className="gutter container-x pt-20" aria-labelledby="map">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 id="map" className="display text-4xl">
            {t.branch.map}
          </h2>
          <a
            href={googleReviewsHref(b)}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1 justify-self-start py-2 font-semibold text-amber hover:underline"
          >
            {t.branch.reviews} <Arrow />
          </a>
        </div>
        <div className="mt-6 overflow-hidden rounded-3xl border border-line">
          <iframe
            title={`${t.branch.map}: ${b.name}`}
            src={mapEmbedSrc(b)}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="block h-[24rem] w-full grayscale-[.3] invert-[.9] hue-rotate-180"
          />
        </div>
      </section>

      {/* Other branch */}
      <section className="gutter container-x pt-20">
        <Link
          to={href(`/${other.id}`)}
          className="group grid items-center gap-6 rounded-3xl border border-line bg-coal p-6 md:grid-cols-[auto_1fr_auto] md:p-8"
        >
          <Photo slug={other.photo} sizes="160px" decorative imgClassName="h-28 w-40 rounded-2xl object-cover" />
          <div>
            <p className="eyebrow">{t.branch.other}</p>
            <p className="display text-5xl">{pick(other.short, locale)}</p>
          </div>
          <Arrow className="text-4xl text-amber transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
        </Link>
      </section>
    </>
  );
}
