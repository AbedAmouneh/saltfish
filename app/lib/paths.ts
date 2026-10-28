import { LOCALES, localizePath } from "./locale";

/** Every public, indexable page (without a locale prefix). */
export const PUBLIC_PAGES = [
  "/",
  "/menu",
  "/menu/drinks",
  "/naccache",
  "/faqra",
  "/events",
  "/story",
  "/book",
  "/play",
  "/play/handroll-rush",
  "/play/catch",
  "/play/trivia",
] as const;
export type PublicPage = (typeof PUBLIC_PAGES)[number];

/** Paths prerendered to static HTML at build time. */
export function prerenderPaths(): string[] {
  const pages = PUBLIC_PAGES.flatMap((p) => LOCALES.map((l) => localizePath(p, l)));
  return [...pages, "/sitemap.xml", "/robots.txt"];
}
