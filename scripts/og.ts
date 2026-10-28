// Generates Open Graph share images (1200×630) for every page and language
// into public/og/<page>-<locale>.jpg.
//
// Usage: npm run og
// Needs Playwright with Chromium: `npm i -D playwright && npx playwright install chromium`
import { mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import ar from "../app/i18n/ar";
import en from "../app/i18n/en";
import fr from "../app/i18n/fr";
import images from "../app/content/images.json" with { type: "json" };

const root = path.resolve(import.meta.dirname, "..");
const require = createRequire(import.meta.url);
type Page = {
  setContent(html: string, o: { waitUntil: "load" }): Promise<void>;
  evaluate<T>(fn: () => T): Promise<T>;
  screenshot(o: { path: string; type: "jpeg"; quality: number }): Promise<unknown>;
};
type Browser = { newPage(o: { viewport: { width: number; height: number } }): Promise<Page>; close(): Promise<void> };
const { chromium } = require("playwright") as { chromium: { launch(): Promise<Browser> } };

const dicts = { en, ar, fr } as const;
type Loc = keyof typeof dicts;

const PAGES: Record<string, { photo: string; title: (t: typeof en) => string; kicker: (t: typeof en) => string }> = {
  home: { photo: "naccache-dining-room", title: (t) => `${t.home.titleA} ${t.home.titleB}`, kicker: (t) => t.home.eyebrow },
  menu: { photo: "zaatar-tiradito", title: (t) => t.menu.title, kicker: (t) => t.menu.tabs.food },
  drinks: { photo: "tomatini", title: (t) => t.menu.drinksTitle, kicker: (t) => t.menu.eyebrow },
  naccache: { photo: "handrolls-tile-counter", title: (t) => t.common.nav.naccache, kicker: () => "Zero 4" },
  faqra: { photo: "faqra-terrace", title: (t) => t.common.nav.faqra, kicker: (t) => t.common.openDaily },
  events: { photo: "packed-room", title: (t) => t.events.title, kicker: (t) => t.events.eyebrow },
  story: { photo: "the-crew-counter", title: (t) => t.story.title, kicker: (t) => t.story.eyebrow },
  play: { photo: "handroll-logo", title: (t) => t.play.title, kicker: (t) => t.play.eyebrow },
  book: { photo: "oysters-red-tile", title: (t) => t.book.title, kicker: (t) => t.book.eyebrow },
};

// Fonts are inlined as data URIs (file:// URLs are blocked inside setContent pages).
const fontFiles = {
  bsd: "@fontsource/big-shoulders-display/files/big-shoulders-display-latin-900-normal.woff2",
  is: "@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2",
  isExt: "@fontsource-variable/instrument-sans/files/instrument-sans-latin-ext-wght-normal.woff2",
  kufi: "@fontsource-variable/noto-kufi-arabic/files/noto-kufi-arabic-arabic-wght-normal.woff2",
};
const fontData: Record<string, string> = {};
for (const [k, p] of Object.entries(fontFiles)) {
  fontData[k] = `data:font/woff2;base64,${(await readFile(path.join(root, "node_modules", p))).toString("base64")}`;
}
const font = (k: keyof typeof fontFiles) => fontData[k];
const fontCss = `
@font-face{font-family:BSD;font-weight:900;src:url(${font("bsd")})}
@font-face{font-family:IS;font-weight:400 700;src:url(${font("is")})}
@font-face{font-family:IS;font-weight:400 700;src:url(${font("isExt")});unicode-range:U+0100-024F,U+1E00-1EFF}
@font-face{font-family:KUFI;font-weight:100 900;src:url(${font("kufi")})}`;

async function photoData(slug: string) {
  const entry = (images as Record<string, { widths: number[] }>)[slug];
  if (!entry) throw new Error(`No photo ${slug}`);
  const w = entry.widths.includes(1600) ? 1600 : Math.max(...entry.widths);
  const buf = await readFile(path.join(root, "public/images", `${slug}-${w}.jpg`));
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
}

function html(loc: Loc, title: string, kicker: string, photo: string) {
  const rtl = loc === "ar";
  return `<!doctype html><html dir="${rtl ? "rtl" : "ltr"}"><head><meta charset="utf-8"><style>${fontCss}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:#120b08;color:#f6e7d6;font-family:IS,KUFI,sans-serif;position:relative;overflow:hidden}
.bg{position:absolute;inset:0;background:url(${photo}) center/cover;opacity:.75}
.shade{position:absolute;inset:0;background:linear-gradient(${rtl ? 270 : 90}deg,#120b08 10%,rgba(18,11,8,.75) 55%,rgba(18,11,8,.15))}
.tile{position:absolute;left:0;right:0;bottom:0;height:14px;background:#b43a2b;background-image:linear-gradient(90deg,rgba(255,228,205,.35) 2px,transparent 2px);background-size:24px 14px}
.wrap{position:absolute;inset:64px 72px 70px;display:flex;flex-direction:column;justify-content:space-between}
.logo{display:flex;flex-direction:column;align-items:center;align-self:flex-start;font:900 44px/1 BSD;letter-spacing:.02em}
.logo svg{width:84px;height:22px}
.logo i{display:inline-block;width:8px;height:8px;border-radius:50%;background:#ff8a3d;margin-left:4px;vertical-align:4px}
.k{font:900 22px/1 ${rtl ? "KUFI" : "BSD"};letter-spacing:${rtl ? 0 : ".18em"};text-transform:uppercase;color:#ff8a3d;margin-bottom:18px}
h1{font:900 ${title.length > 34 ? 84 : 112}px/.9 ${rtl ? "KUFI" : "BSD"};${rtl ? "line-height:1.2;font-weight:800;" : "text-transform:uppercase;"}max-width:900px}
</style></head><body><div class="bg"></div><div class="shade"></div><div class="tile"></div>
<div class="wrap"><div class="logo" dir="ltr"><svg viewBox="0 0 60 16"><path d="M3 12c3-8 10-10 14-5s3 7 7 6 4-9 10-9 6 8 11 7 7-6 11-6" fill="none" stroke="#f6e7d6" stroke-width="2.6" stroke-linecap="round"/></svg><span>SALT FISH<i></i></span></div>
<div><p class="k">${kicker}</p><h1>${title}</h1></div></div></body></html>`;
}

await mkdir(path.join(root, "public/og"), { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const [key, spec] of Object.entries(PAGES)) {
  const photo = await photoData(spec.photo);
  for (const loc of Object.keys(dicts) as Loc[]) {
    const t = dicts[loc] as typeof en;
    await page.setContent(html(loc, spec.title(t), spec.kicker(t), photo), { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const out = path.join(root, "public/og", `${key}-${loc}.jpg`);
    await page.screenshot({ path: out, type: "jpeg", quality: 82 });
    console.log(`og/${key}-${loc}.jpg`);
  }
}
await browser.close();
