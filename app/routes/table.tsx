import { logError } from "~/lib/log.server";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  data,
  Link,
  redirect,
  useFetcher,
  useLoaderData,
  useLocation,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";
import { Logo } from "~/components/Logo";
import { VOXIRE_URL, VoxireWordmark } from "~/components/Voxire";
import { Photo } from "~/components/Photo";
import { usePicks } from "~/components/table/usePicks";
import { Arrow, TagChip } from "~/components/ui";
import { GameArt } from "~/games/GameArt";
import { GAMES, type GameId } from "~/lib/games";
import { branches, drinks, menu, site } from "~/content";
import type { MenuTag } from "~/content/schema";
import { formatPrice, getDict, pick, useI18n } from "~/i18n";
import { RateLimitError } from "~/lib/bookings.server";
import { googleReviewsHref } from "~/lib/contact";
import { addFeedback, FeedbackInput } from "~/lib/feedback.server";
import { FEEDBACK_TAGS } from "~/lib/feedback-tags";
import { isLocale, LOCALE_META, LOCALES, localeFromPath, localizePath, stripLocale, type Locale } from "~/lib/locale";
import { clientIp } from "~/lib/staff.server";

const SaltyChat = lazy(() => import("~/components/salty/SaltyChat"));
const GamePlayer = lazy(() => import("~/games/GamePlayer").then((m) => ({ default: m.GamePlayer })));
const LANG_COOKIE = "sf_lang";

function preferredLocale(acceptLanguage: string | null): Locale {
  const langs = (acceptLanguage ?? "").split(",").map((p) => p.split(";")[0]!.trim().slice(0, 2).toLowerCase());
  for (const l of langs) if (isLocale(l)) return l;
  return "en";
}

/**
 * The QR on each table points to /t/<branch>/<table>. Guests land in their
 * phone's language (Arabic or French) unless they picked one before.
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const locale = localeFromPath(url.pathname);
  const branch = branches.find((b) => b.id === params.branch);
  const table = Number(params.table);
  if (!branch || !Number.isInteger(table) || table < 1 || table > branch.tables) throw data(null, { status: 404 });

  const base = stripLocale(url.pathname);
  const chosen = url.searchParams.get("lang");
  if (chosen && isLocale(chosen)) {
    const cookie = `${LANG_COOKIE}=${chosen}; Path=/t; Max-Age=31536000; SameSite=Lax`;
    throw redirect(localizePath(base, chosen), { headers: { "Set-Cookie": cookie } });
  }
  const saved = request.headers.get("Cookie")?.match(new RegExp(`${LANG_COOKIE}=(\\w+)`))?.[1];
  if (locale === "en") {
    const want = saved && isLocale(saved) ? saved : preferredLocale(request.headers.get("Accept-Language"));
    if (want !== "en") throw redirect(localizePath(base, want));
  }
  return { branchId: branch.id, table };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const branch = branches.find((b) => b.id === params.branch);
  const table = Number(params.table);
  if (!branch || !Number.isInteger(table) || table < 1 || table > branch.tables) return { ok: false as const, error: "invalid" };
  const parsed = FeedbackInput.safeParse(Object.fromEntries(await request.formData()));
  if (!parsed.success) return { ok: false as const, error: "invalid" };
  try {
    await addFeedback(branch.id, table, parsed.data, clientIp(request));
    return { ok: true as const };
  } catch (e) {
    if (!(e instanceof RateLimitError)) logError("feedback failed", e);
    return { ok: false as const, error: e instanceof RateLimitError ? "rate" : "server" };
  }
}

export const meta: MetaFunction<typeof loader> = ({ location, data: d }) => {
  const locale = localeFromPath(location.pathname);
  const t = getDict(locale);
  const b = branches.find((x) => x.id === d?.branchId);
  return [{ title: b && d ? t.table.metaTitle(pick(b.short, locale), d.table) : "Saltfish" }, { name: "robots", content: "noindex, nofollow" }];
};

type Tab = "menu" | "picks" | "play" | "salty" | "feedback";
type Item = { id: string; name: string; price: number; desc?: string; portion?: string; photo?: string | null; tags?: MenuTag[] };
type Section = { id: string; name: string; items: Item[] };

export default function TableMode() {
  const { branchId, table } = useLoaderData<typeof loader>();
  const { t, locale } = useI18n();
  const branch = branches.find((b) => b.id === branchId)!;
  const place = pick(branch.short, locale);
  const [tab, setTab] = useState<Tab>("menu");
  const { picks, change, clear, count } = usePicks(`${branchId}-${table}`);

  // Keep the tab in the URL hash so the back button works.
  useEffect(() => {
    const fromHash = () => {
      const h = window.location.hash.slice(1);
      setTab(h === "picks" || h === "feedback" || h === "salty" || h === "play" ? h : "menu");
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);
  const go = (next: Tab) => {
    if (next !== tab) window.location.hash = next;
    window.scrollTo({ top: 0 });
  };

  const sections = useMemo(() => {
    const food: Section[] = menu.categories.map((c) => ({
      id: c.id,
      name: pick(c.name, locale),
      items: c.items.map((i) => ({
        id: i.id,
        name: i.name,
        price: i.price,
        desc: i.desc ? pick(i.desc, locale) : undefined,
        portion: i.portion ? pick(i.portion, locale) : undefined,
        photo: i.photo,
        tags: i.tags,
      })),
    }));
    const drink: Section[] = drinks.sections.map((s) => ({
      id: `d-${s.id}`,
      name: pick(s.name, locale),
      items: s.groups.flatMap((g) =>
        g.items.map((i) => ({
          id: `d:${i.id}`,
          name: i.name,
          price: i.glass ?? i.price,
          portion: i.glass !== undefined ? t.menu.glass : undefined,
          desc: i.desc ? pick(i.desc, locale) : undefined,
          tags: i.tags,
        })),
      ),
    }));
    return { food, drink };
  }, [locale, t]);

  const allItems = useMemo(() => new Map([...sections.food, ...sections.drink].flatMap((s) => s.items.map((i) => [i.id, i] as const))), [sections]);

  return (
    <div className="mx-auto min-h-dvh max-w-xl bg-night pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">
      <header className="sticky top-0 z-30 border-b border-line bg-night/95 pt-[env(safe-area-inset-top,0px)] backdrop-blur">
        <div className="gutter flex h-14 items-center gap-2">
          <span className="text-xl text-cream">
            <Logo />
          </span>
          <span className="rounded-full bg-ember px-3 py-1 text-xs font-bold text-amber">{t.table.label(place, table)}</span>
          <TableLang className="ms-auto" />
        </div>
      </header>

      <main id="main" tabIndex={-1}>
        {tab === "menu" || tab === "salty" ? (
          <h1 className="sr-only">
            {tab === "menu" ? t.menu.title : "Salty"} · {t.table.label(place, table)}
          </h1>
        ) : null}
        {tab === "menu" ? <MenuTab sections={sections} picks={picks} change={change} /> : null}
        {tab === "picks" ? <PicksTab items={allItems} picks={picks} change={change} clear={clear} goMenu={() => go("menu")} /> : null}
        {tab === "play" ? <PlayTab branchId={branchId} table={table} /> : null}
        {tab === "salty" ? (
          <Suspense fallback={<p className="gutter pt-10 text-sand">{t.salty.thinking}</p>}>
            <SaltyChat variant="full" branch={branchId} table={table} />
          </Suspense>
        ) : null}
        {tab === "feedback" ? <FeedbackTab branchId={branchId} /> : null}
      </main>

      <p className="gutter py-8 text-center text-xs text-dusk">
        <a href={VOXIRE_URL} target="_blank" rel="noopener" className="inline-flex items-center gap-2">
          {t.common.footer.madeBy}
          <VoxireWordmark className="h-6" />
        </a>
      </p>

      <nav
        aria-label={t.common.nav.primary}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-coal/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur"
      >
        <ul className="mx-auto grid max-w-xl grid-cols-5">
          {(
            [
              ["menu", t.table.tabs.menu, "M4 6h16M4 12h16M4 18h10"],
              ["picks", t.table.tabs.picks, "M6 4h12v16l-6-4-6 4z"],
              [
                "play",
                t.table.tabs.play,
                "M6 9h12a3 3 0 0 1 3 3v3a3 3 0 0 1-5.2 2L14 15h-4l-1.8 2A3 3 0 0 1 3 15v-3a3 3 0 0 1 3-3zM8 12v2M7 13h2M15.5 12.5h.01M17.5 14h.01",
              ],
              ["salty", t.table.tabs.salty, "M4 12c3-5 9-7 14-2l3-3v10l-3-3c-5 5-11 3-14-2zM8 11h.01"],
              ["feedback", t.table.tabs.feedback, "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"],
            ] as const
          ).map(([id, label, d]) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => go(id)}
                aria-current={tab === id ? "page" : undefined}
                className={`relative grid w-full justify-items-center gap-1 py-2.5 text-[0.72rem] font-bold ${tab === id ? "text-amber" : "text-sand"}`}
              >
                <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
                  <path d={d} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {label}
                {id === "picks" && count ? (
                  <span className="absolute top-1.5 start-[calc(50%+6px)] grid min-w-5 place-items-center rounded-full bg-amber px-1 text-[0.68rem] text-night tabular-nums">
                    {count}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

function TableLang({ className = "" }: { className?: string }) {
  const { locale } = useI18n();
  const { pathname } = useLocation();
  return (
    <ul className={`flex rounded-full border border-line p-0.5 text-[0.75rem] font-bold ${className}`}>
      {LOCALES.map((l) => (
        <li key={l}>
          <Link
            to={`${pathname}?lang=${l}`}
            reloadDocument
            hrefLang={LOCALE_META[l].hreflang}
            aria-current={l === locale ? "true" : undefined}
            className={`grid h-9 min-w-9 place-items-center rounded-full px-1.5 ${l === locale ? "bg-cream text-night" : "text-sand"}`}
            title={LOCALE_META[l].label}
          >
            {LOCALE_META[l].short}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function MenuTab({
  sections,
  picks,
  change,
}: {
  sections: { food: Section[]; drink: Section[] };
  picks: Record<string, number>;
  change: (id: string, d: number) => void;
}) {
  const { t } = useI18n();
  const [kind, setKind] = useState<"food" | "drink">("food");
  const list = kind === "food" ? sections.food : sections.drink;
  return (
    <div>
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top,0px))] z-20 border-b border-line bg-night/95 backdrop-blur">
        <div className="gutter flex gap-2 pt-3">
          {(["food", "drink"] as const).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={`rounded-full px-4 py-2 text-sm font-bold ${kind === k ? "bg-cream text-night" : "border border-line text-sand"}`}
            >
              {k === "food" ? t.table.food : t.table.drinks}
            </button>
          ))}
        </div>
        <ul className="gutter flex gap-1 overflow-x-auto py-2 [scrollbar-width:none]">
          {list.map((s) => (
            <li key={s.id} className="shrink-0">
              <a
                href={`#${s.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="block rounded-full px-3 py-2 text-sm font-semibold whitespace-nowrap text-sand"
              >
                {s.name}
              </a>
            </li>
          ))}
        </ul>
      </div>
      <div className="gutter grid gap-10 pt-6">
        {list.map((s) => (
          <section key={s.id} id={s.id} className="scroll-mt-36" aria-labelledby={`${s.id}-h`}>
            <h2 id={`${s.id}-h`} className="display mb-2 text-4xl">
              {s.name}
            </h2>
            <ul>
              {s.items.map((i) => (
                <ItemRow key={i.id} item={i} qty={picks[i.id] ?? 0} change={change} />
              ))}
            </ul>
          </section>
        ))}
        <p className="pb-6 text-xs text-dusk">
          {t.common.allergies} {t.common.usd}
        </p>
      </div>
    </div>
  );
}

function ItemRow({ item, qty, change }: { item: Item; qty: number; change: (id: string, d: number) => void }) {
  const { t } = useI18n();
  return (
    <li className="flex gap-3 border-b border-line/70 py-4">
      {item.photo ? <Photo slug={item.photo} sizes="72px" className="shrink-0" imgClassName="size-[4.5rem] rounded-xl object-cover" /> : null}
      <div className="grid min-w-0 flex-1 content-start gap-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-bold leading-snug" lang="en">
            {item.name}
          </h3>
          <span className="font-display text-xl font-[800] text-amber tabular-nums" dir="ltr">
            {formatPrice(item.price)}
          </span>
        </div>
        {item.desc ? <p className="text-sm text-sand">{item.desc}</p> : null}
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {item.portion ? <span className="text-xs font-semibold text-dusk">{item.portion}</span> : null}
          {item.tags?.map((tag) => (
            <TagChip key={tag} tag={tag} />
          ))}
          <span className="ms-auto">
            {qty ? (
              <span className="flex items-center gap-1 rounded-full border border-amber">
                <button
                  type="button"
                  onClick={() => change(item.id, -1)}
                  aria-label={t.table.removeAria(item.name)}
                  className="grid size-9 place-items-center text-lg font-bold text-amber"
                >
                  −
                </button>
                <span className="min-w-4 text-center font-bold tabular-nums" aria-live="polite">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => change(item.id, 1)}
                  aria-label={t.table.addAria(item.name)}
                  className="grid size-9 place-items-center text-lg font-bold text-amber"
                >
                  +
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => change(item.id, 1)}
                aria-label={t.table.addAria(item.name)}
                className="rounded-full border border-line px-3.5 py-1.5 text-sm font-bold text-cream hover:border-amber"
              >
                + {t.table.add}
              </button>
            )}
          </span>
        </div>
      </div>
    </li>
  );
}

function PicksTab({
  items,
  picks,
  change,
  clear,
  goMenu,
}: {
  items: Map<string, Item>;
  picks: Record<string, number>;
  change: (id: string, d: number) => void;
  clear: () => void;
  goMenu: () => void;
}) {
  const { t } = useI18n();
  const [waiter, setWaiter] = useState(false);
  const rows = Object.entries(picks)
    .map(([id, qty]) => ({ item: items.get(id), qty }))
    .filter((r): r is { item: Item; qty: number } => !!r.item);
  const total = rows.reduce((a, r) => a + r.item.price * r.qty, 0);

  if (waiter) {
    return (
      <div
        className="fixed inset-0 z-50 overflow-y-auto bg-cream p-6 pt-[max(1.5rem,env(safe-area-inset-top,0px))] text-night"
        role="dialog"
        aria-modal="true"
        aria-label={t.table.waiterTitle}
      >
        <div className="mx-auto grid max-w-xl gap-6">
          <div className="flex items-center justify-between">
            <h2 className="display text-5xl">{t.table.waiterTitle}</h2>
            <button type="button" onClick={() => setWaiter(false)} className="btn !bg-night !text-cream">
              {t.table.close}
            </button>
          </div>
          <ul className="grid gap-3" lang="en" dir="ltr">
            {rows.map(({ item, qty }) => (
              <li key={item.id} className="flex items-baseline gap-4 border-b border-night/15 pb-3 text-2xl font-bold">
                <span className="font-display text-4xl tabular-nums">{qty}×</span>
                <span>{item.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="gutter grid gap-6 pt-8">
      <h1 className="display text-6xl">{t.table.picksTitle}</h1>
      {rows.length === 0 ? (
        <div className="grid gap-4 rounded-3xl border border-dashed border-line p-6 text-sand">
          <p>{t.table.picksEmpty}</p>
          <button type="button" onClick={goMenu} className="btn btn-primary justify-self-start">
            {t.table.tabs.menu}
          </button>
        </div>
      ) : (
        <>
          <ul className="grid">
            {rows.map(({ item, qty }) => (
              <ItemRow key={item.id} item={item} qty={qty} change={change} />
            ))}
          </ul>
          <div className="flex items-baseline justify-between text-lg">
            <span className="text-sand">{t.table.total}</span>
            <span className="font-display text-3xl font-[800] text-amber" dir="ltr">
              {formatPrice(total)}
            </span>
          </div>
          <p className="text-sm text-dusk">{t.table.picksNote}</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setWaiter(true)} className="btn btn-primary">
              {t.table.showWaiter}
            </button>
            <button type="button" onClick={clear} className="btn btn-ghost">
              {t.table.clear}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function FeedbackTab({ branchId }: { branchId: "naccache" | "faqra" }) {
  const { t, locale } = useI18n();
  const fetcher = useFetcher<typeof action>();
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const branch = branches.find((b) => b.id === branchId)!;
  const done = fetcher.data?.ok;

  useEffect(() => {
    if (fetcher.data && !fetcher.data.ok) setErr(t.table.error);
  }, [fetcher.data, t]);

  if (done) {
    return (
      <div className="gutter grid gap-5 pt-10" aria-live="polite">
        <h1 className="display text-6xl text-amber">{t.table.thanksTitle}</h1>
        <p className="text-lg text-sand">{t.table.thanksBody}</p>
        <div className="grid gap-3 rounded-3xl border border-line bg-coal p-6">
          <p>{t.table.googleAsk}</p>
          <a href={googleReviewsHref(branch)} target="_blank" rel="noopener" className="btn btn-primary justify-self-start">
            {t.table.googleCta}
          </a>
          <a href={site.instagram} target="_blank" rel="noopener" className="justify-self-start text-sm font-semibold text-amber underline">
            {t.table.followCta}
          </a>
        </div>
      </div>
    );
  }

  return (
    <form
      className="gutter grid gap-7 pt-8"
      onSubmit={(e) => {
        e.preventDefault();
        if (!rating) return setErr(t.table.pickRating);
        setErr(null);
        fetcher.submit({ rating: String(rating), tags: tags.join(","), comment, locale, website: "" }, { method: "post" });
      }}
    >
      <div className="grid gap-2">
        <h1 className="display text-6xl">{t.table.feedbackTitle}</h1>
        <p className="text-sand">{t.table.feedbackSub}</p>
      </div>

      <fieldset className="grid gap-3">
        <legend className="mb-2 text-sm font-semibold">{t.table.ratingLabel}</legend>
        <div className="flex gap-2" dir="ltr">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer">
              <input
                type="radio"
                name="rating"
                value={n}
                className="peer sr-only"
                checked={rating === n}
                onChange={() => {
                  setRating(n);
                  setErr(null);
                }}
              />
              <span className="sr-only">{t.table.ratings[n - 1]}</span>
              <svg
                viewBox="0 0 24 24"
                className={`size-12 transition-transform peer-focus-visible:outline-3 peer-focus-visible:outline-amber ${n <= rating ? "scale-105 text-amber" : "text-line"}`}
                aria-hidden="true"
              >
                <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" fill="currentColor" />
              </svg>
            </label>
          ))}
        </div>
        <p className="h-5 text-sm font-semibold text-amber" aria-live="polite">
          {rating ? t.table.ratings[rating - 1] : ""}
        </p>
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="mb-2 text-sm font-semibold">{t.table.tagsLabel}</legend>
        <div className="flex flex-wrap gap-2">
          {FEEDBACK_TAGS.map((tag) => {
            const on = tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={on}
                onClick={() => setTags((x) => (on ? x.filter((y) => y !== tag) : [...x, tag]))}
                className={`rounded-full border px-4 py-2 text-sm font-semibold ${on ? "border-amber bg-amber text-night" : "border-line text-sand"}`}
              >
                {t.table.tagNames[tag]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-2">
        <label htmlFor="fb-comment" className="text-sm font-semibold">
          {t.table.commentLabel}
        </label>
        <textarea id="fb-comment" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} className="field min-h-28" />
      </div>

      {err ? (
        <p role="alert" className="font-semibold text-[#ff8a7e]">
          {err}
        </p>
      ) : null}
      <button type="submit" disabled={fetcher.state !== "idle"} className="btn btn-primary justify-self-start disabled:opacity-60">
        {fetcher.state !== "idle" ? t.table.sending : t.table.send}
      </button>
    </form>
  );
}

function PlayTab({ branchId, table }: { branchId: "naccache" | "faqra"; table: number }) {
  const { t } = useI18n();
  const [game, setGame] = useState<GameId | null>(null);
  if (game)
    return (
      <div className="gutter grid gap-5 pt-6">
        <button type="button" onClick={() => setGame(null)} className="inline-flex items-center gap-1 justify-self-start text-sm font-semibold text-amber">
          <Arrow className="rotate-180" /> {t.play.allGames}
        </button>
        <h1 className="display text-5xl" lang="en">
          {t.play.games[game].name}
        </h1>
        <Suspense fallback={<p className="text-sand">{t.salty.thinking}</p>}>
          <GamePlayer game={game} context={{ branch: branchId, table }} />
        </Suspense>
      </div>
    );
  return (
    <div className="gutter grid gap-5 pt-8">
      <h1 className="display text-6xl">{t.play.title}</h1>
      <p className="text-sand">{t.play.sub}</p>
      <ul className="grid gap-4">
        {GAMES.map((g) => (
          <li key={g}>
            <button
              type="button"
              onClick={() => setGame(g)}
              className="grid w-full grid-cols-[7rem_1fr] overflow-hidden rounded-3xl border border-line bg-coal text-start hover:border-amber"
            >
              <GameArt game={g} className="h-full min-h-28 [&_p]:text-2xl" />
              <span className="grid content-center gap-1 p-4">
                <span className="display text-3xl" lang="en">
                  {t.play.games[g].name}
                </span>
                <span className="text-sm text-sand">{t.play.games[g].tagline}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
