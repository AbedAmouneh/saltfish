import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";
import { LOCALES, DEFAULT_LOCALE } from "./lib/locale";

/**
 * Every public page exists once per language:
 *   /menu      (English, default)
 *   /ar/menu   (Arabic, right-to-left)
 *   /fr/menu   (French)
 * The page module reads the language from the URL.
 */
const pages: [path: string, file: string][] = [
  ["menu", "routes/menu.tsx"],
  ["menu/drinks", "routes/drinks.tsx"],
  ["naccache", "routes/branch.tsx"],
  ["faqra", "routes/branch.tsx"],
  ["events", "routes/events.tsx"],
  ["story", "routes/story.tsx"],
  ["book", "routes/book.tsx"],
  ["play", "routes/play.tsx"],
  ["play/handroll-rush", "routes/play-game.tsx"],
  ["play/catch", "routes/play-game.tsx"],
  ["play/trivia", "routes/play-game.tsx"],
];

const localized = LOCALES.flatMap((locale) => {
  const prefix = locale === DEFAULT_LOCALE ? "" : `${locale}/`;
  const home = locale === DEFAULT_LOCALE ? index("routes/home.tsx", { id: `home-${locale}` }) : route(locale, "routes/home.tsx", { id: `home-${locale}` });
  return [
    home,
    ...pages.map(([path, file]) => route(`${prefix}${path}`, file, { id: `${path}-${locale}` })),
    // Booking status pages are rendered on demand (not prerendered) and kept out of search.
    route(`${prefix}booking/:id`, "routes/booking-status.tsx", { id: `booking-status-${locale}` }),
  ];
});

/** Table mode: the QR code on each table opens /t/<branch>/<table> (own full-screen layout). */
const tableMode = LOCALES.map((locale) =>
  route(`${locale === DEFAULT_LOCALE ? "" : `${locale}/`}t/:branch/:table`, "routes/table.tsx", { id: `table-${locale}` }),
);

export default [
  layout("routes/site-layout.tsx", localized),
  ...tableMode,
  route("staff", "routes/staff/layout.tsx", [
    index("routes/staff/bookings.tsx"),
    route("feedback", "routes/staff/feedback.tsx"),
    route("qr", "routes/staff/qr.tsx"),
    route("scores", "routes/staff/scores.tsx"),
    route("login", "routes/staff/login.tsx"),
    route("logout", "routes/staff/logout.ts"),
  ]),
  route("api/salty", "routes/api.salty.ts"),
  route("api/scores", "routes/api.scores.ts"),
  route("sitemap.xml", "routes/sitemap.ts"),
  route("robots.txt", "routes/robots.ts"),
  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
