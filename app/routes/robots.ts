import { SITE_URL } from "~/lib/seo";

/** /robots.txt — table mode, booking pages, staff and API routes stay out of search results. */
export function loader() {
  const body = `User-agent: *
Allow: /
Disallow: /t/
Disallow: /ar/t/
Disallow: /fr/t/
Disallow: /booking/
Disallow: /ar/booking/
Disallow: /fr/booking/
Disallow: /staff
Disallow: /api/

Sitemap: ${SITE_URL}/sitemap.xml
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
