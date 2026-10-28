import { useLoaderData, useSearchParams, type LoaderFunctionArgs } from "react-router";
import { getBranch } from "~/content";
import { listFeedback } from "~/lib/feedback.server";
import { FEEDBACK_TAGS } from "~/lib/feedback-tags";
import { branchesFor, requireStaff } from "~/lib/staff.server";

const RANGES = [1, 7, 30] as const;

export async function loader({ request }: LoaderFunctionArgs) {
  const scope = await requireStaff(request);
  const url = new URL(request.url);
  const days = RANGES.find((d) => String(d) === url.searchParams.get("days")) ?? 7;
  const rows = (await listFeedback(branchesFor(scope), days)).map(({ ipHash: _ip, ...r }) => r);
  return { rows, days, scope };
}

const TAG_LABEL = { food: "Food", service: "Service", vibe: "Vibe", speed: "Speed", music: "Music" } as const;

export default function StaffFeedback() {
  const { rows, days, scope } = useLoaderData<typeof loader>();
  const [, setParams] = useSearchParams();
  const avg = rows.length ? rows.reduce((a, r) => a + r.rating, 0) / rows.length : 0;
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, c: rows.filter((r) => r.rating === n).length }));
  const tagCount = FEEDBACK_TAGS.map((t) => ({ t, c: rows.filter((r) => r.tags.split(",").includes(t)).length }));
  const low = rows.filter((r) => r.rating <= 2).length;

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-6xl">Feedback</h1>
          <p className="text-sand">From the table QR codes. Low scores are highlighted so a manager can visit the table.</p>
        </div>
        <div className="flex gap-2" role="group" aria-label="Period">
          {RANGES.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={days === d}
              onClick={() => setParams({ days: String(d) }, { replace: true })}
              className={`rounded-full border px-4 py-2 text-sm font-semibold ${days === d ? "border-amber bg-amber text-night" : "border-line text-sand"}`}
            >
              {d === 1 ? "Last 24 h" : `Last ${d} days`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-3">
        <div className="grid gap-1 bg-coal p-6">
          <p className="text-xs font-semibold text-dusk">Average rating</p>
          <p className="display text-6xl text-amber tabular-nums">{rows.length ? avg.toFixed(1) : "–"}</p>
          <p className="text-sm text-sand">{rows.length} responses</p>
        </div>
        <div className="grid content-start gap-2 bg-coal p-6">
          <p className="text-xs font-semibold text-dusk">Ratings</p>
          {dist.map(({ n, c }) => (
            <div key={n} className="flex items-center gap-3 text-sm">
              <span className="w-4 tabular-nums">{n}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-night">
                <span className={`block h-full ${n <= 2 ? "bg-brick" : "bg-amber"}`} style={{ width: rows.length ? `${(c / rows.length) * 100}%` : 0 }} />
              </span>
              <span className="w-6 text-end text-sand tabular-nums">{c}</span>
            </div>
          ))}
        </div>
        <div className="grid content-start gap-2 bg-coal p-6">
          <p className="text-xs font-semibold text-dusk">Mentioned</p>
          <div className="flex flex-wrap gap-2">
            {tagCount.map(({ t, c }) => (
              <span key={t} className="rounded-full border border-line px-3 py-1 text-sm">
                {TAG_LABEL[t]} <b className="tabular-nums">{c}</b>
              </span>
            ))}
          </div>
          {low ? (
            <p className="mt-2 text-sm font-semibold text-[#ff8a7e]">
              {low} low score{low > 1 ? "s" : ""} to follow up
            </p>
          ) : null}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line p-10 text-center text-sand">No feedback in this period yet.</p>
      ) : (
        <ul className="grid gap-3">
          {rows.map((r) => (
            <li key={r.id} className={`grid gap-2 rounded-3xl border bg-coal p-5 ${r.rating <= 2 ? "border-brick" : "border-line"}`}>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="text-lg tracking-widest text-amber" aria-label={`${r.rating} out of 5`}>
                  {"★".repeat(r.rating)}
                  <span className="text-line">{"★".repeat(5 - r.rating)}</span>
                </span>
                <span className="font-bold">
                  {scope === "all" ? `${getBranch(r.branch as "naccache" | "faqra").name} · ` : ""}Table {r.tableNo}
                </span>
                <span className="text-dusk">
                  {new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Beirut", weekday: "short", hour: "2-digit", minute: "2-digit" }).format(
                    new Date(r.createdAt),
                  )}
                </span>
                <span className="text-dusk">{r.locale.toUpperCase()}</span>
              </div>
              {r.tags ? (
                <div className="flex flex-wrap gap-1.5">
                  {r.tags.split(",").map((t) => (
                    <span key={t} className="rounded-full bg-night px-2.5 py-0.5 text-xs font-semibold text-sand">
                      {TAG_LABEL[t as keyof typeof TAG_LABEL] ?? t}
                    </span>
                  ))}
                </div>
              ) : null}
              {r.comment ? <p className="text-cream">{r.comment}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
