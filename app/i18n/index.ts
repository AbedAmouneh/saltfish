import { useLocation } from "react-router";
import { localeFromPath, LOCALE_META, localizePath, type Locale } from "~/lib/locale";
import ar from "./ar";
import en, { type Dict } from "./en";
import fr from "./fr";

const dictionaries: Record<Locale, Dict> = { en, ar, fr };

export function getDict(locale: Locale): Dict {
  return dictionaries[locale];
}

/** Current locale, dictionary and a helper to build localized links. */
export function useI18n() {
  const { pathname } = useLocation();
  const locale = localeFromPath(pathname);
  return {
    locale,
    t: dictionaries[locale],
    dir: LOCALE_META[locale].dir,
    href: (path: string) => localizePath(path, locale),
  };
}

/** Pick the current language from a {en, ar, fr} content field. */
export function pick(value: { en: string; ar: string; fr: string }, locale: Locale): string {
  return value[locale];
}

const numberLocale: Record<Locale, string> = { en: "en-US", ar: "ar-LB", fr: "fr-FR" };

/** Prices stay in Latin digits with a $ so they match the printed menu in every language. */
export function formatPrice(value: number): string {
  return `$${Number.isInteger(value) ? value : value.toFixed(1)}`;
}

export function formatDate(iso: string, locale: Locale, opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }): string {
  return new Intl.DateTimeFormat(numberLocale[locale], { ...opts, timeZone: "Asia/Beirut" }).format(new Date(`${iso}T12:00:00+03:00`));
}

/** "12:00" → "12 PM" (en), "12 h" (fr), "١٢ الظهر"-style handled by Intl for ar */
export function formatTime(hhmm: string, locale: Locale): string {
  if (hhmm === "24:00") return locale === "fr" ? "minuit" : locale === "ar" ? "١٢ بالليل" : "12 AM";
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  const d = new Date(Date.UTC(2026, 0, 1, h, m));
  return new Intl.DateTimeFormat(numberLocale[locale], { hour: "numeric", minute: m ? "2-digit" : undefined, timeZone: "UTC" }).format(d);
}
