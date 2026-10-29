# Saltfish website

The website for **Saltfish**, the Mediterrasian restaurant and hand roll counter in Naccache (Zero 4) and Faqra, Lebanon.
Design direction **A: Counter Glow** (dark, cinematic, built on their night photography).

- React 19 + TypeScript, React Router 7 (framework mode, Vite)
- Tailwind CSS 4, self-hosted fonts (Big Shoulders Display, Instrument Sans, Noto Kufi Arabic)
- English, Arabic (right-to-left) and French at `/`, `/ar/…` and `/fr/…`
- Every public page is prerendered to static HTML for speed and SEO; SSR stays on for the upcoming API routes
- Deploys to Vercel with `@vercel/react-router`

## Getting started

Requires Node 22 or newer.

```bash
npm install
npm run dev          # http://localhost:5173
npm run typecheck    # strict TypeScript
npm run build        # validates content, builds and prerenders 39 pages + sitemap.xml + robots.txt
npm start            # runs the production build at http://localhost:3000 (needs a .env, see below)
```

`npm run dev` needs no setup. `npm start` runs in production mode, so copy `.env.example` to `.env` and set at least
`SESSION_SECRET` and `STAFF_PASSWORD` (both commands read `.env` automatically).

## Editing content (no code needed)

Everything on the site comes from the JSON files in `app/content/`:

| File            | What's in it                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| `menu.json`     | Food menu: categories, dishes, prices (USD), descriptions in EN/AR/FR, tags, photos                     |
| `drinks.json`   | Cocktails, wine, sake, beer, spirits (glass and bottle prices), soft drinks                             |
| `branches.json` | Naccache and Faqra: address, map pin, phones, WhatsApp number, hours, seating, tables (20 each for now) |
| `events.json`   | Weekly rituals (The Saturday Thing, DJ nights…) and one-off events with a date                          |
| `site.json`     | Site URL, Instagram, Spotify playlist, price range                                                      |

After editing, run `npm run content:check`. It tells you exactly which field is wrong (for example a missing Arabic description or a
photo that doesn't exist). The build runs the same check, so broken content can never be deployed.

Dish names stay in English on purpose; descriptions and the interface are translated. Interface text lives in `app/i18n/en.ts`, `ar.ts` and `fr.ts`.

Tags you can use on dishes: `raw`, `vegetarian`, `spicy`, `signature`, `favorite`.

### Photos

The Arabic font is a trimmed copy of Noto Kufi Arabic (43 KB instead of 124 KB) in `app/fonts/`; rebuild it with
`scripts/subset-arabic-font.sh` if you ever change weights.

Original photos are in `research/instagram/photos` (downloaded from @saltfish.lb). To use a new photo:

1. Add it to `scripts/photo-sources.json` with a slug and alt text in all three languages.
2. Run `npm run images` (creates AVIF, WebP and JPEG at 480/960/1600 px in `public/images` and updates `app/content/images.json`).
3. Reference the slug from any content file, e.g. `"photo": "lobster-roll"`.

Browsers keep photos for 30 days (set in `vercel.json`). To change a photo that is already live, give it a new slug
instead of overwriting the old files, so visitors see the new one right away.

### Share images

`public/og/<page>-<lang>.jpg` are the 1200×630 previews used when a page is shared on WhatsApp, Instagram or Facebook.
Regenerate them after changing page titles: `npm i -D playwright && npx playwright install chromium && npm run og`.

## SEO checklist (done)

- Prerendered HTML for all 39 public pages (13 pages × 3 languages)
- Unique title and description per page and language
- Canonical URL plus `hreflang` alternates (en, ar, fr, x-default) on every page
- `<html lang>` and `dir="rtl"` for Arabic
- Open Graph and Twitter cards with per-page, per-language share images
- JSON-LD: `Organization`, `WebSite`, `Restaurant` per branch (address, geo, opening hours, reservations, menu), `Menu` with all dishes and prices,
  `Event` for dated events, `BreadcrumbList`
- `sitemap.xml` with hreflang alternates, `robots.txt` (blocks `/t/`, `/staff`, `/api/`)
- Real 404 status for unknown URLs
- Responsive AVIF/WebP images with width/height and blur placeholders, hero image loaded with high priority
- Semantic headings (one `<h1>` per page), skip link, keyboard focus styles, reduced-motion support

### To do at launch

1. Set the real domain in `app/content/site.json` (`url`) and rebuild. All canonical links, the sitemap and share images use it.
2. Add the site to Google Search Console and submit `https://<domain>/sitemap.xml`.
3. Put the website link on both Google Business Profiles (Naccache and Faqra) and in the Instagram bio.
4. Validate a page with Google's Rich Results Test.

## Deploying to Vercel

1. Push this folder to a Git repository.
2. In Vercel, "Add New Project" and import the repository. The React Router preset is detected automatically.
3. Commercial sites need the Vercel **Pro** plan (Hobby is for personal, non-commercial use).

## Project structure

```
app/
  content/      JSON content, schemas and build-time validation
  i18n/         interface text in en / ar / fr
  components/   header, footer, photo, menu UI, cards, Salty chat, table "My picks"
  games/        Handroll Rush, Catch of the Day, Salt or Fish?, shared shell + leaderboard
  db/           Postgres schema (bookings, feedback, scores, rate limits) and client
  routes/       public pages, booking status, table mode, staff/, api.salty, api.scores, sitemap, robots, 404
  lib/          locale, SEO (meta + JSON-LD), bookings, feedback, scores, staff auth, Salty prompt + knowledge
scripts/        image pipeline, share-image generator, content check
public/         optimized photos, share images, icons
research/       research notes, menu capture, Instagram originals
```

## Features

| Area        | Where                                                                             | Notes                                                                                                                                                                       |
| ----------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public site | `/`, `/menu`, `/menu/drinks`, `/naccache`, `/faqra`, `/events`, `/story`, `/play` | EN at `/`, Arabic at `/ar/…`, French at `/fr/…`, all prerendered                                                                                                            |
| Bookings    | `/book` → `/booking/<id>`                                                         | Saved as **pending**, guest sends it on WhatsApp, staff confirm in `/staff`; the guest's status page updates                                                                |
| Table mode  | `/t/<branch>/<table>`                                                             | The QR on each table. Menu with "My picks" to show the waiter, games, Salty, feedback. Opens in the phone's language                                                        |
| Salty       | Floating button on the site, tab in table mode                                    | AI host on Claude or Gemini (free tier), knows the menu/branches/events from the JSON files. Streams replies; demo mode without an API key                                               |
| Games       | `/play`, table mode                                                               | Handroll Rush, Catch of the Day, Salt or Fish? Leaderboards tonight / week / all time, per branch at the tables. Signed tickets reject impossible scores                    |
| Staff       | `/staff`                                                                          | Bookings (confirm / decline → one-tap WhatsApp reply in the guest's language), Feedback (low scores flagged), QR codes (printable, 20 per branch), Scores (hide rude names) |

## Environment variables

See `.env.example`. On Vercel, add them under Project → Settings → Environment Variables:

- `DATABASE_URL`: add a Neon database from Vercel → Storage; tables are created automatically on first use
- `SESSION_SECRET`: any long random string
- `STAFF_PASSWORD` (managers), and optionally `STAFF_PASSWORD_NACCACHE` / `STAFF_PASSWORD_FAQRA`
- Salty's AI, one of:
  - `GEMINI_API_KEY`: free from Google AI Studio (aistudio.google.com, no card). The free tier has daily request limits
    and Google may use free-tier prompts to improve its products, so move to a paid key or Claude for launch
  - `ANTHROPIC_API_KEY`: from the Claude Console, with a monthly spend limit (used first when set)
  - `AI_API_KEY` + `AI_BASE_URL` + `SALTY_MODEL`: any OpenAI-compatible service such as Groq or OpenRouter
- `SALTY_DAILY_LIMIT` (optional, default 3000): Salty messages per day across the whole site, a cost guard

Security headers (no framing, no sniffing, strict referrer, no camera/mic/location) are set in `vercel.json`.
Check them once after the first deploy with `curl -I https://<domain>/`.

Locally, none are required: `npm run dev` uses an embedded database in `./.data`, staff password `saltfish-dev`, and Salty in demo mode.

## Roadmap

- **Done:** foundation, public site + SEO, bookings with staff confirmation, table mode with feedback and QR sheet, Salty, the three games
- **Next (Phase 7):** translation review by Saltfish, real logo, final photos, accessibility and performance passes on real devices, domain and launch
- **Later:** Direction B ("Paper Poster") as an alternative look

## Open items from Saltfish

- Confirm the WhatsApp numbers (using 03 374 344 for Naccache and 03 372 767 for Faqra)
- Faqra's exact address and year-round hours
- Real table count per branch (20 is a placeholder)
- Allergen information per dish
- Official logo files (the current wordmark is a placeholder)
- Domain name
- Halloween 2026 start time
