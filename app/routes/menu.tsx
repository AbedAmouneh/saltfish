import { useState } from "react";
import type { MetaFunction } from "react-router";
import { MenuTabs, SectionRail } from "~/components/MenuTabs";
import { Photo } from "~/components/Photo";
import { PageHero, TagChip } from "~/components/ui";
import { menu } from "~/content";
import type { MenuItem, MenuTag } from "~/content/schema";
import { formatPrice, getDict, pick, useI18n } from "~/i18n";
import { localeFromPath } from "~/lib/locale";
import { breadcrumbLd, menuLd, pageMeta } from "~/lib/seo";

export const meta: MetaFunction = ({ location }) => {
  const locale = localeFromPath(location.pathname);
  const t = getDict(locale);
  return pageMeta({
    pathname: location.pathname,
    title: t.menu.metaTitle,
    description: t.menu.metaDescription,
    og: "menu",
    jsonLd: [
      menuLd(locale),
      breadcrumbLd(location.pathname, [
        { name: "Saltfish", path: "/" },
        { name: t.menu.title, path: "/menu" },
      ]),
    ],
  });
};

type Filter = "all" | Exclude<MenuTag, "favorite">;
const FILTERS: Filter[] = ["all", "raw", "vegetarian", "spicy", "signature"];

function matches(item: MenuItem, f: Filter) {
  if (f === "all") return true;
  if (f === "signature") return item.tags.includes("signature") || item.tags.includes("favorite");
  return item.tags.includes(f);
}

export default function MenuPage() {
  const { t, locale } = useI18n();
  const [filter, setFilter] = useState<Filter>("all");

  return (
    <>
      <PageHero eyebrow={t.menu.eyebrow} title={t.menu.title} sub={t.menu.sub} photo="table-spread">
        <MenuTabs />
      </PageHero>

      <SectionRail label={t.menu.jump} sections={menu.categories.map((c) => ({ id: c.id, name: pick(c.name, locale) }))} />

      <div className="gutter container-x">
        <div className="flex flex-wrap items-center gap-2 py-6" role="group" aria-label={t.menu.filtersLabel}>
          <span className="me-2 text-sm font-semibold text-dusk">{t.menu.filtersLabel}</span>
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                filter === f ? "border-amber bg-amber text-night" : "border-line text-sand hover:border-dusk hover:text-cream"
              }`}
            >
              {t.menu.filters[f]}
            </button>
          ))}
        </div>

        <div className="grid gap-20 pb-10">
          {menu.categories.map((cat) => {
            const visible = cat.items.filter((i) => matches(i, filter));
            return (
              <section key={cat.id} id={cat.id} aria-labelledby={`${cat.id}-title`} className="scroll-mt-40 md:scroll-mt-48">
                <div className="grid items-end gap-6 border-b border-line pb-6 md:grid-cols-[1fr_auto]">
                  <div className="grid gap-2">
                    <h2 id={`${cat.id}-title`} className="display text-[clamp(2.6rem,6vw,4.5rem)]">
                      {pick(cat.name, locale)}
                    </h2>
                    {cat.note ? <p className="max-w-[60ch] text-sand">{pick(cat.note, locale)}</p> : null}
                  </div>
                  {cat.photo ? (
                    <Photo
                      slug={cat.photo}
                      sizes="(min-width: 768px) 240px, 40vw"
                      decorative
                      className="hidden md:block"
                      imgClassName="h-36 w-60 rounded-2xl object-cover"
                    />
                  ) : null}
                </div>
                {visible.length ? (
                  <ul className="grid grid-cols-1 gap-x-12 md:grid-cols-2 [&>*]:min-w-0">
                    {visible.map((item) => (
                      <MenuRow key={item.id} item={item} />
                    ))}
                  </ul>
                ) : (
                  <p className="py-6 text-dusk">{t.menu.empty}</p>
                )}
              </section>
            );
          })}
        </div>

        <aside className="grid gap-1 rounded-2xl border border-line p-5 text-sm text-sand">
          <p>{t.common.allergies}</p>
          <p>{t.common.usd}</p>
        </aside>
      </div>
    </>
  );
}

function MenuRow({ item }: { item: MenuItem }) {
  const { locale } = useI18n();
  return (
    <li id={item.id} className="grid scroll-mt-40 grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1.5 border-b border-line/70 py-5 md:scroll-mt-48">
      <div className="flex min-w-0 gap-4">
        {item.photo ? (
          <Photo slug={item.photo} sizes="88px" className="shrink-0" imgClassName="size-[4.5rem] rounded-xl object-cover md:size-[5.5rem]" />
        ) : null}
        <div className="grid min-w-0 content-start gap-1.5">
          <h3 className="text-[1.05rem] leading-snug font-bold" lang="en">
            {item.name}
          </h3>
          {item.desc ? <p className="text-sm leading-relaxed text-sand">{pick(item.desc, locale)}</p> : null}
          {item.tags.length || item.portion || item.note ? (
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {item.portion ? <span className="text-xs font-semibold text-dusk">{pick(item.portion, locale)}</span> : null}
              {item.note ? <span className="rounded-full bg-sun px-2 py-0.5 text-[0.7rem] font-bold text-night">{pick(item.note, locale)}</span> : null}
              {item.tags.map((tag) => (
                <TagChip key={tag} tag={tag} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <p className="font-display text-2xl font-[800] text-amber tabular-nums" dir="ltr">
        {formatPrice(item.price)}
      </p>
    </li>
  );
}
