import type { MetaFunction } from "react-router";
import { MenuTabs, SectionRail } from "~/components/MenuTabs";
import { Photo } from "~/components/Photo";
import { PageHero, TagChip } from "~/components/ui";
import { drinks } from "~/content";
import { formatPrice, getDict, pick, useI18n } from "~/i18n";
import { localeFromPath } from "~/lib/locale";
import { breadcrumbLd, pageMeta } from "~/lib/seo";

export const meta: MetaFunction = ({ location }) => {
  const locale = localeFromPath(location.pathname);
  const t = getDict(locale);
  return pageMeta({
    pathname: location.pathname,
    title: t.menu.drinksMetaTitle,
    description: t.menu.drinksMetaDescription,
    og: "drinks",
    jsonLd: [
      breadcrumbLd(location.pathname, [
        { name: "Saltfish", path: "/" },
        { name: t.menu.title, path: "/menu" },
        { name: t.menu.drinksTitle, path: "/menu/drinks" },
      ]),
    ],
  });
};

export default function DrinksPage() {
  const { t, locale } = useI18n();
  return (
    <>
      <PageHero eyebrow={t.menu.eyebrow} title={t.menu.drinksTitle} sub={t.menu.drinksSub} photo="sake-shelf">
        <MenuTabs />
      </PageHero>

      <SectionRail label={t.menu.jump} sections={drinks.sections.map((s) => ({ id: s.id, name: pick(s.name, locale) }))} />

      <div className="gutter container-x grid gap-20 pt-10 pb-10">
        {drinks.sections.map((section) => (
          <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="scroll-mt-40 md:scroll-mt-48">
            <div className="grid items-end gap-6 border-b border-line pb-6 md:grid-cols-[1fr_auto]">
              <h2 id={`${section.id}-title`} className="display text-[clamp(2.6rem,6vw,4.5rem)]">
                {pick(section.name, locale)}
              </h2>
              {section.photo ? (
                <Photo slug={section.photo} sizes="240px" decorative className="hidden md:block" imgClassName="h-36 w-60 rounded-2xl object-cover" />
              ) : null}
            </div>

            <div className="mt-8 grid gap-12 md:grid-cols-2">
              {section.groups.map((group) => {
                const hasGlass = group.items.some((i) => i.glass !== undefined);
                return (
                  <div key={group.id} className="min-w-0">
                    {section.groups.length > 1 || group.name.en !== section.name.en ? <h3 className="eyebrow mb-3">{pick(group.name, locale)}</h3> : null}
                    <table className="w-full text-start">
                      {section.priceLabels || hasGlass ? (
                        <thead>
                          <tr className="text-xs text-dusk">
                            <th scope="col" className="pb-2 text-start font-semibold">
                              <span className="sr-only">{pick(group.name, locale)}</span>
                            </th>
                            {hasGlass ? (
                              <th scope="col" className="w-16 pb-2 text-end font-semibold">
                                {t.menu.glass}
                              </th>
                            ) : (
                              <td className="w-16" />
                            )}
                            <th scope="col" className="w-20 pb-2 text-end font-semibold">
                              {t.menu.bottle}
                            </th>
                          </tr>
                        </thead>
                      ) : null}
                      <tbody>
                        {group.items.map((d) => (
                          <tr key={d.id} id={d.id} className="border-b border-line/70 align-top">
                            <th scope="row" className="py-3.5 pe-4 text-start font-normal">
                              <span className="block font-bold" lang="en">
                                {d.name}
                              </span>
                              {d.desc ? <span className="mt-1 block text-sm text-sand">{pick(d.desc, locale)}</span> : null}
                              {d.tags?.length ? (
                                <span className="mt-2 flex flex-wrap gap-1.5">
                                  {d.tags.map((tag) => (
                                    <TagChip key={tag} tag={tag} />
                                  ))}
                                </span>
                              ) : null}
                            </th>
                            {section.priceLabels || hasGlass ? (
                              <td className="py-3.5 text-end font-semibold text-sand tabular-nums" dir="ltr">
                                {d.glass !== undefined ? formatPrice(d.glass) : ""}
                              </td>
                            ) : null}
                            <td className="py-3.5 text-end font-display text-xl font-[800] text-amber tabular-nums" dir="ltr">
                              {formatPrice(d.price)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <aside className="grid gap-1 rounded-2xl border border-line p-5 text-sm text-sand">
          <p>{t.common.usd}</p>
        </aside>
      </div>
    </>
  );
}
