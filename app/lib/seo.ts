import { beirutIso } from "./time";
import type { MetaDescriptor } from "react-router";
import { branches, events, images, menu, site } from "~/content";
import type { Branch } from "~/content/schema";
import { getDict } from "~/i18n";
import { LOCALES, LOCALE_META, localeFromPath, localizePath, stripLocale, type Locale } from "./locale";

export const SITE_URL = site.url.replace(/\/$/, "");
export const absolute = (path: string) => `${SITE_URL}${path === "/" ? "" : path}` || SITE_URL;

type PageMetaInput = {
  pathname: string;
  title: string;
  description: string;
  /** OG image key in /public/og (e.g. "home" → /og/home-en.jpg) */
  og?: string;
  noindex?: boolean;
  jsonLd?: object[];
};

/**
 * Title, description, canonical, hreflang alternates, Open Graph, Twitter and
 * JSON-LD for one page, in the page's own language.
 */
/** Search results show about 160 characters: end at a full sentence when we can, otherwise at a word. */
export function clampDescription(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const head = clean.slice(0, max);
  const sentence = Math.max(...[".", "!", "?", "؟"].map((p) => head.lastIndexOf(p + " ")));
  if (sentence >= 90) return head.slice(0, sentence + 1);
  return head.slice(0, head.lastIndexOf(" ")).replace(/[,،;:·\-–]+$/, "") + "…";
}

export function pageMeta({ pathname, title, description: rawDescription, og = "home", noindex, jsonLd = [] }: PageMetaInput): MetaDescriptor[] {
  const description = clampDescription(rawDescription);
  const locale = localeFromPath(pathname);
  const base = stripLocale(pathname);
  const url = absolute(localizePath(base, locale));
  const image = `${SITE_URL}/og/${og}-${locale}.jpg`;

  const tags: MetaDescriptor[] = [
    { title },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: url },
    ...LOCALES.map((l) => ({ tagName: "link", rel: "alternate", hrefLang: LOCALE_META[l].hreflang, href: absolute(localizePath(base, l)) })),
    { tagName: "link", rel: "alternate", hrefLang: "x-default", href: absolute(localizePath(base, "en")) },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: site.name },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { property: "og:locale", content: LOCALE_META[locale].og },
    ...LOCALES.filter((l) => l !== locale).map((l) => ({ property: "og:locale:alternate", content: LOCALE_META[l].og })),
    { property: "og:image", content: image },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: title },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image },
  ];
  if (noindex) tags.push({ name: "robots", content: "noindex, nofollow" });
  for (const data of jsonLd) tags.push({ "script:ld+json": data });
  return tags;
}

/* ------------------------------------------------------------------ */
/* JSON-LD builders                                                    */
/* ------------------------------------------------------------------ */

const imageUrl = (slug: string) => {
  const img = images[slug];
  const w = img ? Math.max(...img.widths) : 1600;
  return `${SITE_URL}/images/${slug}-${w}.jpg`;
};

const DAY_URI: Record<string, string> = {
  Mo: "https://schema.org/Monday",
  Tu: "https://schema.org/Tuesday",
  We: "https://schema.org/Wednesday",
  Th: "https://schema.org/Thursday",
  Fr: "https://schema.org/Friday",
  Sa: "https://schema.org/Saturday",
  Su: "https://schema.org/Sunday",
};

export function organizationLd(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: site.name,
    alternateName: site.legalName,
    url: SITE_URL,
    logo: `${SITE_URL}/icons/icon-512.png`,
    description: site.tagline[locale],
    sameAs: [site.instagram, site.spotifyPlaylist],
    subOrganization: branches.map((b) => ({ "@id": `${SITE_URL}/${b.id}#restaurant` })),
  };
}

export function websiteLd(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: site.name,
    url: absolute(localizePath("/", locale)),
    inLanguage: LOCALE_META[locale].hreflang,
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

export function restaurantLd(branch: Branch, locale: Locale) {
  const t = getDict(locale);
  return {
    "@context": "https://schema.org",
    "@type": ["Restaurant", "SeafoodRestaurant"],
    "@id": `${SITE_URL}/${branch.id}#restaurant`,
    name: branch.name,
    description: branch.blurb[locale],
    url: absolute(localizePath(`/${branch.id}`, locale)),
    image: [branch.photo, ...branch.gallery].slice(0, 4).map(imageUrl),
    telephone: branch.phones[0],
    priceRange: site.priceRange,
    servesCuisine: site.servesCuisine,
    acceptsReservations: absolute(localizePath("/book", locale)),
    hasMenu: absolute(localizePath("/menu", locale)),
    currenciesAccepted: "USD",
    address: {
      "@type": "PostalAddress",
      streetAddress: branch.address.street,
      addressLocality: branch.address.locality,
      addressRegion: branch.address.region,
      addressCountry: branch.address.country,
    },
    geo: { "@type": "GeoCoordinates", latitude: branch.geo.lat, longitude: branch.geo.lng },
    hasMap: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(branch.name)}&query_place_id=${branch.googlePlaceId}`,
    openingHoursSpecification: branch.hours.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.days.map((d) => DAY_URI[d]),
      opens: h.opens,
      closes: h.closes === "24:00" ? "23:59" : h.closes,
    })),
    amenityFeature: branch.highlights.map((h) => ({ "@type": "LocationFeatureSpecification", name: t.branch.highlights[h], value: true })),
    parentOrganization: { "@id": `${SITE_URL}/#organization` },
    sameAs: [site.instagram],
  };
}

export function menuLd(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "Menu",
    "@id": `${SITE_URL}/menu#menu`,
    name: `${site.name} — ${getDict(locale).menu.title}`,
    url: absolute(localizePath("/menu", locale)),
    inLanguage: LOCALE_META[locale].hreflang,
    hasMenuSection: menu.categories.map((c) => ({
      "@type": "MenuSection",
      name: c.name[locale],
      ...(c.photo ? { image: imageUrl(c.photo) } : {}),
      hasMenuItem: c.items.map((i) => ({
        "@type": "MenuItem",
        name: i.name,
        ...(i.desc ? { description: i.desc[locale] } : {}),
        ...(i.photo ? { image: imageUrl(i.photo) } : {}),
        ...(i.tags.includes("vegetarian") ? { suitableForDiet: "https://schema.org/VegetarianDiet" } : {}),
        offers: { "@type": "Offer", price: i.price.toFixed(2), priceCurrency: "USD" },
      })),
    })),
  };
}

export function breadcrumbLd(pathname: string, items: { name: string; path: string }[]) {
  const locale = localeFromPath(pathname);
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absolute(localizePath(it.path, locale)),
    })),
  };
}

export function eventsLd(locale: Locale) {
  const today = __BUILD_DATE__;
  return (
    events.oneOff
      // Only confirmed events go to Google, so search never shows a date the team hasn't locked in
      .filter((e) => e.confirmed && e.date >= today)
      .map((e) => {
        const venues = e.branch === "both" ? branches : branches.filter((b) => b.id === e.branch);
        return {
          "@context": "https://schema.org",
          "@type": "Event",
          name: e.title,
          description: e.summary[locale],
          startDate: e.start ? beirutIso(e.date, e.start) : e.date,
          eventStatus: "https://schema.org/EventScheduled",
          eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
          image: [imageUrl(e.photo)],
          location: venues.map((b) => ({
            "@type": "Place",
            name: b.name,
            address: {
              "@type": "PostalAddress",
              addressLocality: b.address.locality,
              addressRegion: b.address.region,
              addressCountry: b.address.country,
            },
          })),
          organizer: { "@type": "Organization", name: site.name, url: SITE_URL },
        };
      })
  );
}
