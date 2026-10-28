export const LOCALES = ["en", "ar", "fr"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_META: Record<Locale, { label: string; short: string; dir: "ltr" | "rtl"; og: string; hreflang: string }> = {
  en: { label: "English", short: "EN", dir: "ltr", og: "en_US", hreflang: "en" },
  ar: { label: "العربية", short: "عربي", dir: "rtl", og: "ar_AR", hreflang: "ar" },
  fr: { label: "Français", short: "FR", dir: "ltr", og: "fr_FR", hreflang: "fr" },
};

export function isLocale(v: string | undefined): v is Locale {
  return !!v && (LOCALES as readonly string[]).includes(v);
}

/** "/ar/menu" → "ar", "/menu" → "en" */
export function localeFromPath(pathname: string): Locale {
  const first = pathname.split("/")[1];
  return isLocale(first) && first !== DEFAULT_LOCALE ? first : DEFAULT_LOCALE;
}

/** "/ar/menu" → "/menu", "/ar" → "/" */
export function stripLocale(pathname: string): string {
  const loc = localeFromPath(pathname);
  if (loc === DEFAULT_LOCALE) return normalize(pathname);
  const rest = pathname.slice(loc.length + 1);
  return normalize(rest || "/");
}

/** ("/menu", "ar") → "/ar/menu", ("/", "fr") → "/fr" */
export function localizePath(path: string, locale: Locale): string {
  const clean = normalize(path);
  if (locale === DEFAULT_LOCALE) return clean;
  return clean === "/" ? `/${locale}` : `/${locale}${clean}`;
}

function normalize(p: string): string {
  const withSlash = p.startsWith("/") ? p : `/${p}`;
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, "") : withSlash;
}
