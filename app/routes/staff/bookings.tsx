import { useEffect } from "react";
import { Link, useFetcher, useLoaderData, useRevalidator, useSearchParams, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { getBranch } from "~/content";
import type { Booking } from "~/db/schema";
import { BOOKING_STATUSES, type BookingStatus } from "~/lib/booking-status";
import { formatDate, formatTime, getDict } from "~/i18n";
import { staffReply } from "~/lib/booking-message";
import { beirutToday, listBookings, setBookingStatus } from "~/lib/bookings.server";
import { telHref } from "~/lib/contact";
import { isLocale, localizePath, type Locale } from "~/lib/locale";
import { toWhatsappNumber } from "~/lib/phone";
import { branchesFor, publicOrigin, requireStaff } from "~/lib/staff.server";

const VIEWS = ["today", "upcoming", "past"] as const;
type View = (typeof VIEWS)[number];

export async function loader({ request }: LoaderFunctionArgs) {
  const scope = await requireStaff(request);
  const url = new URL(request.url);
  const view = (VIEWS as readonly string[]).includes(url.searchParams.get("view") ?? "") ? (url.searchParams.get("view") as View) : "upcoming";
  const allowed = branchesFor(scope);
  const b = url.searchParams.get("branch");
  const branches = b && (allowed as string[]).includes(b) ? [b as "naccache" | "faqra"] : allowed;
  const statusParam = url.searchParams.get("status");
  const status = (BOOKING_STATUSES as readonly string[]).includes(statusParam ?? "") ? (statusParam as BookingStatus) : undefined;
  const rows = (await listBookings({ branches, view, status })).map(({ ipHash: _ip, ...r }) => r);
  return { rows, scope, view, origin: publicOrigin(url), today: beirutToday(), now: Date.now() };
}

export async function action({ request }: ActionFunctionArgs) {
  const scope = await requireStaff(request);
  const form = await request.formData();
  const id = String(form.get("id") ?? "");
  const status = String(form.get("status") ?? "") as BookingStatus;
  if (!(BOOKING_STATUSES as readonly string[]).includes(status)) return { ok: false as const };
  const row = await setBookingStatus(id, status, branchesFor(scope));
  return { ok: !!row, id };
}

const STATUS_STYLE: Record<BookingStatus, string> = {
  pending: "bg-sun text-night",
  confirmed: "bg-leaf text-night",
  declined: "bg-brick text-cream",
  cancelled: "bg-line text-sand",
};

export default function StaffBookings() {
  const { rows, scope, view, origin, today, now } = useLoaderData<typeof loader>();
  const [params, setParams] = useSearchParams();
  const revalidator = useRevalidator();

  // New requests appear without reloading: refresh every 30 s while the tab is visible.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible" && revalidator.state === "idle") revalidator.revalidate();
    }, 30_000);
    return () => clearInterval(id);
  }, [revalidator]);

  const pending = rows.filter((r) => r.status === "pending").length;
  useEffect(() => {
    document.title = pending ? `(${pending}) Bookings | Saltfish staff` : "Bookings | Saltfish staff";
  }, [pending]);

  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };

  const groups = new Map<string, typeof rows>();
  for (const r of rows) groups.set(r.date, [...(groups.get(r.date) ?? []), r]);

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-6xl">Bookings</h1>
          <p className="text-sand">{pending ? `${pending} waiting for confirmation` : "Nothing waiting"} · refreshes every 30 seconds</p>
        </div>
        <button type="button" onClick={() => revalidator.revalidate()} className="btn btn-ghost !min-h-10 text-sm">
          {revalidator.state === "loading" ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filters">
        {VIEWS.map((v) => (
          <Chip key={v} active={view === v} onClick={() => setParam("view", v === "upcoming" ? null : v)}>
            {v === "today" ? "Today" : v === "upcoming" ? "Upcoming" : "Past"}
          </Chip>
        ))}
        <span className="mx-2 w-px bg-line" aria-hidden="true" />
        {scope === "all"
          ? (["naccache", "faqra"] as const).map((b) => (
              <Chip key={b} active={params.get("branch") === b} onClick={() => setParam("branch", params.get("branch") === b ? null : b)}>
                {b === "naccache" ? "Naccache" : "Faqra"}
              </Chip>
            ))
          : null}
        <span className="mx-2 w-px bg-line" aria-hidden="true" />
        {BOOKING_STATUSES.map((s) => (
          <Chip key={s} active={params.get("status") === s} onClick={() => setParam("status", params.get("status") === s ? null : s)}>
            {s[0]!.toUpperCase() + s.slice(1)}
          </Chip>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line p-10 text-center text-sand">
          No bookings here yet. New requests from the website show up automatically.
        </p>
      ) : (
        [...groups.entries()].map(([date, list]) => (
          <section key={date} className="grid gap-3" aria-label={date}>
            <h2 className="eyebrow">
              {date === today ? "Today · " : ""}
              {formatDate(date, "en")}
            </h2>
            <ul className="grid gap-3">
              {list.map((r) => (
                <BookingCard key={r.id} b={r} origin={origin} isNew={now - new Date(r.createdAt).getTime() < 15 * 60_000} showBranch={scope === "all"} />
              ))}
            </ul>
          </section>
        ))
      )}
      <p className="text-xs text-dusk">
        Guests also send their request on WhatsApp with the same reference. Confirm here so their status page updates, then send the reply.{" "}
        <Link to="/" className="underline">
          Open the website
        </Link>
      </p>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-semibold ${active ? "border-amber bg-amber text-night" : "border-line text-sand hover:text-cream"}`}
    >
      {children}
    </button>
  );
}

function BookingCard({ b, origin, isNew, showBranch }: { b: Omit<Booking, "ipHash">; origin: string; isNew: boolean; showBranch: boolean }) {
  const fetcher = useFetcher<typeof action>();
  const branch = getBranch(b.branch as "naccache" | "faqra");
  const locale: Locale = isLocale(b.locale) ? b.locale : "en";
  const optimistic = (fetcher.formData?.get("status") as BookingStatus | null) ?? b.status;
  const t = getDict("en");
  const statusUrl = `${origin}${localizePath(`/booking/${b.id}`, locale)}`;
  const reply = (s: "confirmed" | "declined") =>
    `https://wa.me/${toWhatsappNumber(b.phone)}?text=${encodeURIComponent(staffReply(s, { ...b, branch }, locale, statusUrl))}`;

  return (
    <li
      className={`grid gap-4 rounded-3xl border bg-coal p-5 md:grid-cols-[7rem_1fr_auto] md:items-center ${isNew && optimistic === "pending" ? "border-sun/70" : "border-line"}`}
    >
      <div className="flex items-baseline gap-3 md:block">
        <p className="display text-4xl tabular-nums">{formatTime(b.time, "en")}</p>
        <p className="text-sm text-sand">
          {b.guests} {b.guests === 1 ? "guest" : "guests"}
        </p>
      </div>
      <div className="grid min-w-0 gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${STATUS_STYLE[optimistic]}`}>{optimistic}</span>
          {isNew && optimistic === "pending" ? <span className="rounded-full border border-sun px-2 py-0.5 text-xs font-bold text-sun">New</span> : null}
          <span className="font-mono text-xs text-dusk">{b.ref}</span>
          {showBranch ? <span className="text-xs font-semibold text-sand">{branch.name}</span> : null}
        </div>
        <p className="text-lg font-bold">{b.name}</p>
        <p className="text-sm text-sand">
          {b.seating === "any" ? "No seating preference" : t.branch.seatingTypes[b.seating as "counter" | "indoor" | "terrace"].title}
          {b.occasion !== "none" ? ` · ${t.book.occasions[b.occasion as keyof typeof t.book.occasions]}` : ""}
          {` · ${locale.toUpperCase()}`}
        </p>
        {b.notes ? <p className="rounded-xl bg-night p-3 text-sm">{b.notes}</p> : null}
        <p className="flex flex-wrap gap-x-4 text-sm">
          <a href={telHref(b.phone)} className="font-semibold text-cream underline" dir="ltr">
            {b.phone}
          </a>
          <a href={`https://wa.me/${toWhatsappNumber(b.phone)}`} target="_blank" rel="noopener" className="font-semibold text-amber underline">
            WhatsApp guest
          </a>
        </p>
      </div>
      <div className="flex flex-wrap gap-2 md:flex-col md:items-stretch">
        {optimistic === "pending" ? (
          <>
            <fetcher.Form method="post">
              <input type="hidden" name="id" value={b.id} />
              <button name="status" value="confirmed" className="btn btn-primary w-full !min-h-10 text-sm">
                Confirm
              </button>
            </fetcher.Form>
            <fetcher.Form method="post">
              <input type="hidden" name="id" value={b.id} />
              <button name="status" value="declined" className="btn btn-ghost w-full !min-h-10 text-sm">
                Decline
              </button>
            </fetcher.Form>
          </>
        ) : optimistic === "confirmed" || optimistic === "declined" ? (
          <>
            <a href={reply(optimistic)} target="_blank" rel="noopener" className="btn btn-primary !min-h-10 text-sm">
              Send {optimistic === "confirmed" ? "confirmation" : "apology"} on WhatsApp
            </a>
            <fetcher.Form method="post">
              <input type="hidden" name="id" value={b.id} />
              <button name="status" value={optimistic === "confirmed" ? "cancelled" : "pending"} className="w-full text-xs font-semibold text-dusk underline">
                {optimistic === "confirmed" ? "Mark as cancelled" : "Undo"}
              </button>
            </fetcher.Form>
          </>
        ) : (
          <fetcher.Form method="post">
            <input type="hidden" name="id" value={b.id} />
            <button name="status" value="pending" className="w-full text-xs font-semibold text-dusk underline">
              Reopen
            </button>
          </fetcher.Form>
        )}
      </div>
    </li>
  );
}
