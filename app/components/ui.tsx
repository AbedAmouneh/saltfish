import type { ReactNode } from "react";
import { Link } from "react-router";
import { images } from "~/content";
import type { Branch, MenuItem as MenuItemT, MenuTag } from "~/content/schema";
import { formatPrice, formatTime, pick, useI18n } from "~/i18n";
import { Photo } from "./Photo";

/** Arrow that points "forward" in both reading directions. */
export function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={`inline-block size-[1em] rtl:-scale-x-100 ${className}`} aria-hidden="true">
      <path d="M4 10h11m-4-5 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SectionHeading({ eyebrow, title, sub, action, id }: { eyebrow?: string; title: string; sub?: string; action?: ReactNode; id?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div className="grid max-w-3xl gap-4">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2 id={id} className="display text-[clamp(2.6rem,6vw,4.75rem)]">
          {title}
        </h2>
        {sub ? <p className="max-w-[58ch] text-lg text-sand">{sub}</p> : null}
      </div>
      {action}
    </div>
  );
}

/** Interior page opener: eyebrow, big title, intro, optional photo strip behind. */
export function PageHero({ eyebrow, title, sub, photo, children }: { eyebrow: string; title: string; sub?: string; photo?: string; children?: ReactNode }) {
  return (
    <section className="relative isolate overflow-hidden pt-32 pb-14 md:pt-44 md:pb-20">
      {photo ? (
        <>
          <Photo slug={photo} sizes="100vw" priority decorative className="absolute inset-0 -z-20" imgClassName="size-full object-cover opacity-45" />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(18,11,8,.55)_0%,rgba(18,11,8,.75)_55%,#120b08_100%)]" />
        </>
      ) : null}
      <div className="gutter container-x grid gap-5">
        <p className="eyebrow animate-rise">{eyebrow}</p>
        <h1 className="display animate-rise text-[clamp(3.4rem,10vw,8rem)] [animation-delay:80ms]">{title}</h1>
        {sub ? <p className="animate-rise max-w-[60ch] text-lg text-sand [animation-delay:160ms] md:text-xl">{sub}</p> : null}
        {children}
      </div>
    </section>
  );
}

export function Ticker({ items }: { items: string[] }) {
  const row = [...items, ...items];
  return (
    <div className="overflow-hidden border-y border-line bg-coal py-4" aria-hidden="true">
      <div dir="ltr" className="flex w-max animate-ticker gap-10 whitespace-nowrap motion-reduce:animate-none">
        {row.map((it, i) => (
          <span key={i} className="display flex items-center gap-10 text-2xl text-dusk md:text-3xl">
            {it}
            <span className="inline-block size-2 rounded-full bg-amber" />
          </span>
        ))}
      </div>
    </div>
  );
}

export function TagChip({ tag }: { tag: MenuTag }) {
  const { t } = useI18n();
  const tone: Record<MenuTag, string> = {
    raw: "border-[#6fb3b8]/40 text-[#9fd3d6]",
    vegetarian: "border-leaf/40 text-leaf",
    spicy: "border-brick/60 text-[#ff7a6e]",
    signature: "border-amber/50 text-amber",
    favorite: "border-sun/50 text-sun",
  };
  return <span className={`rounded-full border px-2 py-0.5 text-[0.7rem] font-bold whitespace-nowrap ${tone[tag]}`}>{t.menu.tags[tag]}</span>;
}

/** Large photo card used for signature dishes. */
export function DishCard({ item, href }: { item: MenuItemT; href: string }) {
  const { locale } = useI18n();
  if (!item.photo || !images[item.photo]) return null;
  return (
    <Link to={href} className="group grid gap-3">
      <div className="relative overflow-hidden rounded-2xl bg-coal">
        <Photo
          slug={item.photo}
          sizes="(min-width: 1440px) 410px, (min-width: 768px) 30vw, 42vw"
          imgClassName="aspect-[4/5] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
        <span className="absolute end-3 top-3 rounded-full bg-night/85 px-3 py-1 text-sm font-bold text-amber tabular-nums backdrop-blur" dir="ltr">
          {formatPrice(item.price)}
        </span>
      </div>
      <div className="grid gap-1">
        <h3 className="text-lg font-bold" dir="ltr" lang="en" style={{ textAlign: "start" }}>
          {item.name}
        </h3>
        {item.desc ? <p className="line-clamp-2 text-sm text-sand">{pick(item.desc, locale)}</p> : null}
      </div>
    </Link>
  );
}

export function HoursList({ branch }: { branch: Branch }) {
  const { t, locale } = useI18n();
  return (
    <ul className="grid gap-1.5">
      {branch.hours.map((h, i) => {
        const days = h.days.length === 7 ? t.days.everyDay : h.days.map((d) => t.days[d]).join(", ");
        return (
          <li key={i} className="flex justify-between gap-6">
            <span>{days}</span>
            <span className="font-semibold tabular-nums">
              {formatTime(h.opens, locale)} – {formatTime(h.closes, locale)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function BranchCard({ branch }: { branch: Branch }) {
  const { t, locale, href } = useI18n();
  return (
    <article className="group relative isolate grid min-h-[28rem] overflow-hidden rounded-3xl border border-line">
      <Photo
        slug={branch.photo}
        sizes="(min-width: 1440px) 620px, (min-width: 768px) 46vw, 90vw"
        decorative
        className="absolute inset-0 -z-20"
        imgClassName="size-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(18,11,8,.1)_0%,rgba(18,11,8,.55)_45%,rgba(18,11,8,.96)_100%)]" />
      <div className="grid content-end gap-4 p-6 md:p-8">
        <p className="eyebrow">{pick(branch.venue, locale)}</p>
        <h3 className="display text-6xl md:text-7xl">{pick(branch.short, locale)}</h3>
        <p className="max-w-md text-sand">{pick(branch.blurb, locale)}</p>
        <p className="text-sm font-semibold">
          {t.common.openDaily} · {t.common.hoursShort}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link to={href(`/${branch.id}`)} className="btn btn-ghost">
            {t.common.directions} <Arrow />
          </Link>
          <Link to={`${href("/book")}?branch=${branch.id}`} className="btn btn-primary">
            {t.common.bookTable}
          </Link>
        </div>
      </div>
    </article>
  );
}
