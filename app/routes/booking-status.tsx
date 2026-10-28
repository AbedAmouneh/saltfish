import { icsDataUrl } from "~/lib/time";
import { data, Link, useLoaderData, type LoaderFunctionArgs, type MetaFunction } from "react-router";
import { Photo } from "~/components/Photo";
import { getBranch } from "~/content";
import { formatDate, formatTime, getDict, pick, useI18n } from "~/i18n";
import { getBooking } from "~/lib/bookings.server";
import { directionsHref, whatsappHref } from "~/lib/contact";
import { localeFromPath } from "~/lib/locale";

export async function loader({ params }: LoaderFunctionArgs) {
  const b = await getBooking(params.id ?? "");
  if (!b) throw data(null, { status: 404 });
  // Only what the guest needs to see; no phone number in the page.
  return {
    id: b.id,
    ref: b.ref,
    branch: b.branch as "naccache" | "faqra",
    date: b.date,
    time: b.time,
    guests: b.guests,
    seating: b.seating,
    status: b.status,
    firstName: b.name.split(" ")[0] ?? "",
    createdAt: b.createdAt.toISOString(),
  };
}

export const meta: MetaFunction = ({ location }) => {
  const t = getDict(localeFromPath(location.pathname));
  return [{ title: t.bookingStatus.metaTitle }, { name: "robots", content: "noindex, nofollow" }];
};

function icsHref(b: { ref: string; date: string; time: string; guests: number; createdAt: string }, branchName: string, address: string) {
  return icsDataUrl({
    uid: `${b.ref}@saltfish`,
    stamp: new Date(b.createdAt),
    date: b.date,
    time: b.time,
    minutes: 120,
    summary: `${branchName} (${b.guests}) · ${b.ref}`,
    location: address,
  });
}

const TONE = {
  pending: "border-sun/60 text-sun",
  confirmed: "border-leaf/60 text-leaf",
  declined: "border-brick/70 text-[#ff8a7e]",
  cancelled: "border-line text-dusk",
} as const;

export default function BookingStatus() {
  const b = useLoaderData<typeof loader>();
  const { t, locale, href } = useI18n();
  const branch = getBranch(b.branch);
  const status = b.status as keyof typeof TONE;
  return (
    <section className="gutter container-x grid gap-10 pt-32 pb-10 md:grid-cols-[1.2fr_1fr] md:pt-44">
      <div className="grid content-start gap-6">
        <p className="eyebrow">{t.bookingStatus.eyebrow}</p>
        <h1 className="display text-[clamp(3.4rem,9vw,7rem)]">{t.bookingStatus.title}</h1>
        <p className={`justify-self-start rounded-full border-2 px-4 py-2 text-lg font-bold ${TONE[status]}`} role="status">
          {t.bookingStatus.statuses[status]}
        </p>
        <p className="max-w-[48ch] text-lg text-sand">{t.bookingStatus.bodies[status]}</p>

        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-line bg-line">
          {[
            [t.book.refLabel, <span dir="ltr">{b.ref}</span>],
            [t.book.branch, branch.name],
            [t.book.date, formatDate(b.date, locale)],
            [t.book.time, formatTime(b.time, locale)],
            [t.book.guests, String(b.guests)],
            [t.book.seating, b.seating === "any" ? t.book.seatingAny : t.branch.seatingTypes[b.seating as "counter" | "indoor" | "terrace"].title],
          ].map(([k, v], i) => (
            <div key={i} className="grid gap-1 bg-coal p-5">
              <dt className="text-xs font-semibold text-dusk">{k}</dt>
              <dd className="text-lg font-bold">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-wrap gap-3">
          {status !== "declined" && status !== "cancelled" ? (
            <a href={icsHref(b, branch.name, pick(branch.address.display, "en"))} download={`saltfish-${b.ref}.ics`} className="btn btn-primary">
              {t.bookingStatus.addToCalendar}
            </a>
          ) : null}
          <a href={directionsHref(branch)} target="_blank" rel="noopener" className="btn btn-ghost">
            {t.common.directions}
          </a>
          <a href={whatsappHref(branch, `${b.ref}`)} target="_blank" rel="noopener" className="btn btn-ghost">
            {t.bookingStatus.contact}
          </a>
        </div>
        <Link to={href("/book")} className="justify-self-start text-sm font-semibold text-amber underline">
          {t.bookingStatus.newBooking}
        </Link>
      </div>
      <Photo slug={branch.photo} sizes="(min-width: 768px) 40vw, 100vw" decorative imgClassName="aspect-[4/5] w-full rounded-3xl object-cover" />
    </section>
  );
}

export function ErrorBoundary() {
  const { t, href } = useI18n();
  return (
    <section className="gutter container-x grid min-h-[60dvh] place-items-center pt-32 text-center">
      <div className="grid justify-items-center gap-5">
        <h1 className="display text-6xl">{t.bookingStatus.notFound}</h1>
        <Link to={href("/book")} className="btn btn-primary">
          {t.bookingStatus.newBooking}
        </Link>
      </div>
    </section>
  );
}
