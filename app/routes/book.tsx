import { useEffect, useId, useState, type FormEvent } from "react";
import { Link, useFetcher, useSearchParams, type ActionFunctionArgs, type MetaFunction } from "react-router";
import { Photo } from "~/components/Photo";
import { PageHero } from "~/components/ui";
import { branches, getBranch } from "~/content";
import type { BranchId, Seating } from "~/content/schema";
import { getDict, pick, formatTime, useI18n } from "~/i18n";
import { guestMessage } from "~/lib/booking-message";
import { addDays, beirutNowHM, beirutToday } from "~/lib/time";
import { logError } from "~/lib/log.server";
import { BookingInput, bookingWindowError, createBooking, RateLimitError } from "~/lib/bookings.server";
import { telHref, whatsappHref } from "~/lib/contact";
import { localeFromPath } from "~/lib/locale";
import { breadcrumbLd, pageMeta } from "~/lib/seo";
import { clientIp } from "~/lib/staff.server";

export const meta: MetaFunction = ({ location }) => {
  const locale = localeFromPath(location.pathname);
  const t = getDict(locale);
  return pageMeta({
    pathname: location.pathname,
    title: t.book.metaTitle,
    description: t.book.metaDescription,
    og: "book",
    jsonLd: [
      breadcrumbLd(location.pathname, [
        { name: "Saltfish", path: "/" },
        { name: t.book.title, path: "/book" },
      ]),
    ],
  });
};

type ActionResult = { ok: true; id: string; ref: string } | { ok: false; error: "invalid" | "rate" | "server" };

/** Saves the request as "pending". Staff confirm it in /staff. */
export async function action({ request }: ActionFunctionArgs): Promise<ActionResult> {
  const parsed = BookingInput.safeParse(Object.fromEntries(await request.formData()));
  if (!parsed.success || bookingWindowError(parsed.data.date, parsed.data.time)) return { ok: false, error: "invalid" };
  try {
    const row = await createBooking(parsed.data, clientIp(request));
    return { ok: true, id: row.id, ref: row.ref };
  } catch (e) {
    if (e instanceof RateLimitError) return { ok: false, error: "rate" };
    logError("booking failed", e);
    return { ok: false, error: "server" };
  }
}

const SLOTS = Array.from({ length: 23 }, (_, i) => {
  const mins = 12 * 60 + i * 30; // 12:00 → 23:00
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${mins % 60 ? "30" : "00"}`;
});
const OCCASIONS = ["none", "birthday", "date", "business", "celebration"] as const;
type Occasion = (typeof OCCASIONS)[number];

type Form = {
  branch: BranchId;
  date: string;
  time: string;
  guests: number;
  seating: Seating | "any";
  occasion: Occasion;
  name: string;
  phone: string;
  notes: string;
};
type Errors = Partial<Record<keyof Form, string>>;
type Sent = { url: string; text: string; phone: string; ref?: string; statusHref?: string };

export default function BookPage() {
  const { t, locale, href } = useI18n();
  const [params] = useSearchParams();
  const fetcher = useFetcher<ActionResult>();
  const uid = useId();
  const [today, setToday] = useState(__BUILD_DATE__);
  const [nowHM, setNowHM] = useState("00:00");
  const [form, setForm] = useState<Form>({
    branch: "naccache",
    date: __BUILD_DATE__,
    time: "20:00",
    guests: 2,
    seating: "any",
    occasion: "none",
    name: "",
    phone: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState<Sent | null>(null);
  const [copied, setCopied] = useState(false);

  // Read ?branch= and ?seating= from links like "Book a counter seat", and use the real date.
  useEffect(() => {
    const now = beirutToday();
    const hm = beirutNowHM();
    setToday(now);
    setNowHM(hm);
    const b = params.get("branch");
    const s = params.get("seating");
    setForm((f) => {
      // Late in the evening, today's slots are gone: suggest the next free slot, or tomorrow
      let date = f.date < now ? now : f.date;
      let time = f.time;
      if (date === now && time <= hm) {
        const next = SLOTS.find((slot) => slot > hm);
        if (next) time = next > "20:00" ? next : "20:00";
        else date = addDays(now, 1);
      }
      return {
        ...f,
        date,
        time,
        branch: b === "faqra" || b === "naccache" ? b : f.branch,
        seating: s === "counter" || s === "indoor" || s === "terrace" ? s : f.seating,
      };
    });
  }, [params]);

  const branch = getBranch(form.branch);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
    setFormError(null);
  };

  // When the server answers: show the WhatsApp step with the booking reference.
  useEffect(() => {
    const res = fetcher.data;
    if (!res || fetcher.state !== "idle") return;
    if (res.ok) {
      const text = guestMessage({ ...form, branch, ref: res.ref }, locale);
      setSent({ url: whatsappHref(branch, text), text, phone: branch.phones[0]!, ref: res.ref, statusHref: href(`/booking/${res.id}`) });
    } else if (res.error === "server") {
      // Database unreachable: the guest can still book straight on WhatsApp.
      const text = guestMessage({ ...form, branch }, locale);
      setSent({ url: whatsappHref(branch, text), text, phone: branch.phones[0]! });
    } else {
      setFormError(res.error === "rate" ? t.book.rateLimited : t.book.errorGeneric);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.data, fetcher.state]);

  function validate(): Errors {
    const e: Errors = {};
    if (!form.date) e.date = t.book.required;
    else if (form.date < today) e.date = t.book.pastDate;
    else if (form.date > addDays(today, 90)) e.date = t.book.tooFar;
    else if (form.date === today && form.time <= beirutNowHM()) e.time = t.book.pastTime;
    if (e.time) setNowHM(beirutNowHM());
    if (!form.name.trim()) e.name = t.book.required;
    if (form.phone.replace(/\D/g, "").length < 7) e.phone = t.book.invalidPhone;
    return e;
  }

  function onSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    const first = Object.keys(e)[0];
    if (first) {
      document.getElementById(`${uid}-${first}`)?.focus();
      return;
    }
    const data = new FormData();
    for (const [k, v] of Object.entries(form)) data.set(k, String(v));
    data.set("locale", locale);
    data.set("website", (ev.currentTarget.elements.namedItem("website") as HTMLInputElement | null)?.value ?? "");
    fetcher.submit(data, { method: "post" });
  }
  const sending = fetcher.state !== "idle";

  const field = (k: keyof Form) => ({
    id: `${uid}-${k}`,
    "aria-invalid": errors[k] ? true : undefined,
    "aria-describedby": errors[k] ? `${uid}-${k}-err` : undefined,
  });
  const Err = ({ k }: { k: keyof Form }) =>
    errors[k] ? (
      <p id={`${uid}-${k}-err`} className="text-sm font-semibold text-[#ff8a7e]">
        {errors[k]}
      </p>
    ) : null;

  return (
    <>
      <PageHero eyebrow={t.book.eyebrow} title={t.book.title} sub={t.book.sub} />

      <div className="gutter container-x grid grid-cols-1 items-start gap-12 lg:grid-cols-[1.4fr_1fr] [&>*]:min-w-0">
        {sent ? (
          <section className="grid gap-5 rounded-3xl border border-amber/50 bg-coal p-6 md:p-10" aria-live="polite">
            <h2 className="display text-5xl">{t.book.sentTitle}</h2>
            {sent.ref ? (
              <p className="grid gap-1">
                <span className="eyebrow">{t.book.refLabel}</span>
                <span className="display text-6xl text-amber" dir="ltr">
                  {sent.ref}
                </span>
              </p>
            ) : null}
            <p className="text-lg text-sand">{t.book.sentBody}</p>
            <div className="flex flex-wrap gap-3">
              <a href={sent.url} target="_blank" rel="noopener" className="btn btn-primary">
                {t.book.sendWhatsapp}
              </a>
              {sent.statusHref ? (
                <Link to={sent.statusHref} className="btn btn-ghost">
                  {t.book.track}
                </Link>
              ) : null}
            </div>
            <div className="grid gap-2">
              <p className="text-sm text-dusk">
                {t.book.notOpened}{" "}
                <a href={telHref(sent.phone)} dir="ltr" className="font-semibold text-cream">
                  {sent.phone}
                </a>
              </p>
              <pre className="rounded-2xl border border-line bg-night p-4 font-sans text-sm whitespace-pre-wrap text-sand">{sent.text}</pre>
              <button
                type="button"
                className="btn btn-ghost justify-self-start"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(sent.text);
                    setCopied(true);
                  } catch {
                    setCopied(false);
                  }
                }}
              >
                {copied ? t.common.copied : t.common.copy}
              </button>
            </div>
            <button
              type="button"
              className="justify-self-start text-sm font-semibold text-amber underline"
              onClick={() => {
                setSent(null);
                fetcher.reset();
              }}
            >
              {t.book.again}
            </button>
          </section>
        ) : (
          <form
            method="post"
            noValidate
            onSubmit={onSubmit}
            className="grid grid-cols-1 gap-8 rounded-3xl border border-line bg-coal p-4 sm:p-6 md:p-10 [&>*]:min-w-0"
            aria-busy={sending}
          >
            {/* honeypot for bots: hidden from people and screen readers */}
            <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
            <fieldset className="grid gap-3">
              <legend className="eyebrow mb-3">{t.book.branch}</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {branches.map((b) => (
                  <label
                    key={b.id}
                    className={`relative flex cursor-pointer items-center gap-4 overflow-hidden rounded-2xl border p-3 transition-colors ${
                      form.branch === b.id ? "border-amber bg-ember" : "border-line hover:border-dusk"
                    }`}
                  >
                    <input type="radio" name="branch" value={b.id} checked={form.branch === b.id} onChange={() => set("branch", b.id)} className="sr-only" />
                    <Photo slug={b.photo} sizes="64px" decorative imgClassName="size-16 rounded-xl object-cover" />
                    <span className="grid">
                      <span className="display text-3xl">{pick(b.short, locale)}</span>
                      <span className="text-xs text-sand">{pick(b.venue, locale)}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div className="grid content-start gap-2">
                <label htmlFor={`${uid}-date`} className="text-sm font-semibold">
                  {t.book.date}
                </label>
                <input
                  type="date"
                  className="field"
                  min={today}
                  max={addDays(today, 90)}
                  value={form.date}
                  onChange={(e) => set("date", e.target.value)}
                  required
                  {...field("date")}
                />
                <Err k="date" />
              </div>
              <div className="grid content-start gap-2">
                <label htmlFor={`${uid}-time`} className="text-sm font-semibold">
                  {t.book.time}
                </label>
                <select className="field" value={form.time} onChange={(e) => set("time", e.target.value)} {...field("time")}>
                  {SLOTS.map((s) => (
                    <option key={s} value={s} disabled={form.date === today && s <= nowHM}>
                      {formatTime(s, locale)}
                    </option>
                  ))}
                </select>
                <Err k="time" />
              </div>
              <div className="grid content-start gap-2">
                <label htmlFor={`${uid}-guests`} className="text-sm font-semibold">
                  {t.book.guests}
                </label>
                <select className="field" value={form.guests} onChange={(e) => set("guests", Number(e.target.value))} {...field("guests")}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="-mt-4 text-sm text-dusk">{t.book.bigGroup}</p>

            <fieldset className="grid gap-3">
              <legend className="text-sm font-semibold">{t.book.seating}</legend>
              <div className="flex flex-wrap gap-2">
                {(["any", ...branch.seating] as const).map((s) => (
                  <label
                    key={s}
                    className={`cursor-pointer rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-amber ${
                      form.seating === s ? "border-amber bg-amber text-night" : "border-line text-sand hover:border-dusk"
                    }`}
                  >
                    <input type="radio" name="seating" value={s} checked={form.seating === s} onChange={() => set("seating", s)} className="sr-only" />
                    {s === "any" ? t.book.seatingAny : t.branch.seatingTypes[s].title}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-2">
              <label htmlFor={`${uid}-occasion`} className="text-sm font-semibold">
                {t.book.occasion}
              </label>
              <select className="field" value={form.occasion} onChange={(e) => set("occasion", e.target.value as Occasion)} {...field("occasion")}>
                {OCCASIONS.map((o) => (
                  <option key={o} value={o}>
                    {t.book.occasions[o]}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="grid content-start gap-2">
                <label htmlFor={`${uid}-name`} className="text-sm font-semibold">
                  {t.book.name}
                </label>
                <input className="field" autoComplete="name" value={form.name} onChange={(e) => set("name", e.target.value)} required {...field("name")} />
                <Err k="name" />
              </div>
              <div className="grid content-start gap-2">
                <label htmlFor={`${uid}-phone`} className="text-sm font-semibold">
                  {t.book.phone}
                </label>
                <input
                  className="field"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  dir="ltr"
                  placeholder="+961"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  required
                  {...field("phone")}
                />
                <p className="text-xs text-dusk">{t.book.phoneHint}</p>
                <Err k="phone" />
              </div>
            </div>

            <div className="grid gap-2">
              <label htmlFor={`${uid}-notes`} className="text-sm font-semibold">
                {t.book.notes}
              </label>
              <textarea
                className="field min-h-24"
                placeholder={t.book.notesHint}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                {...field("notes")}
              />
            </div>

            {formError ? (
              <p role="alert" className="rounded-2xl border border-brick/60 bg-brick/15 p-4 font-semibold text-[#ffb3aa]">
                {formError}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={sending}
              className="btn btn-primary w-full !min-h-13 !px-7 whitespace-normal sm:w-auto sm:justify-self-start text-base disabled:opacity-60"
            >
              {sending ? t.book.sending : t.book.submit}
            </button>
          </form>
        )}

        <aside className="grid gap-6 lg:sticky lg:top-28">
          <div className="grid gap-4 rounded-3xl border border-line p-6">
            <h2 className="eyebrow">{t.book.how.title}</h2>
            <ol className="grid gap-3">
              {t.book.how.steps.map((s, i) => (
                <li key={i} className="flex gap-4">
                  <span className="display text-3xl text-amber">{i + 1}</span>
                  <span className="self-center">{s}</span>
                </li>
              ))}
            </ol>
          </div>
          <Photo slug="handrolls-tile-counter" sizes="(min-width: 1024px) 30vw, 100vw" decorative imgClassName="aspect-[4/3] w-full rounded-3xl object-cover" />
        </aside>
      </div>
    </>
  );
}
