import { LOCALES, LOCALE_META, localizePath } from "~/lib/locale";
import { PUBLIC_PAGES } from "~/lib/paths";
import { absolute } from "~/lib/seo";

const PRIORITY: Record<string, string> = { "/": "1.0", "/menu": "0.9", "/book": "0.9", "/naccache": "0.8", "/faqra": "0.8" };

/** /sitemap.xml with hreflang alternates for every language version. */
export function loader() {
  const lastmod = __BUILD_DATE__;
  const urls = PUBLIC_PAGES.flatMap((page) =>
    LOCALES.map((locale) => {
      const alternates = LOCALES.map(
        (l) => `    <xhtml:link rel="alternate" hreflang="${LOCALE_META[l].hreflang}" href="${absolute(localizePath(page, l))}"/>`,
      ).join("\n");
      return [
        "  <url>",
        `    <loc>${absolute(localizePath(page, locale))}</loc>`,
        alternates,
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${absolute(page)}"/>`,
        `    <lastmod>${lastmod}</lastmod>`,
        `    <changefreq>${page === "/events" ? "weekly" : "monthly"}</changefreq>`,
        `    <priority>${PRIORITY[page] ?? "0.7"}</priority>`,
        "  </url>",
      ].join("\n");
    }),
  );
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join("\n")}
</urlset>
`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
