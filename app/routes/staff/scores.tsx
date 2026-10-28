import { useFetcher, useLoaderData, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { recentScores, setScoreHidden } from "~/lib/scores.server";
import { branchesFor, requireStaff } from "~/lib/staff.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const scope = await requireStaff(request);
  return { rows: await recentScores(150, scope === "all" ? null : branchesFor(scope)) };
}

export async function action({ request }: ActionFunctionArgs) {
  const scope = await requireStaff(request);
  const f = await request.formData();
  await setScoreHidden(String(f.get("id")), f.get("hidden") === "true", scope === "all" ? null : branchesFor(scope));
  return { ok: true };
}

const GAME = { "handroll-rush": "Handroll Rush", catch: "Catch of the Day", trivia: "Salt or Fish?" } as Record<string, string>;

export default function StaffScores() {
  const { rows } = useLoaderData<typeof loader>();
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="display text-6xl">Game scores</h1>
        <p className="text-sand">Latest scores from the website and the tables. Hide anything with a rude name; it disappears from every leaderboard.</p>
      </div>
      <div className="overflow-x-auto rounded-3xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-coal text-start text-xs text-dusk">
            <tr>
              <th className="p-3 text-start">Name</th>
              <th className="p-3 text-start">Game</th>
              <th className="p-3 text-end">Score</th>
              <th className="p-3 text-start">Where</th>
              <th className="p-3 text-start">When</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <Row key={r.id} r={r} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ r }: { r: Awaited<ReturnType<typeof loader>>["rows"][number] }) {
  const f = useFetcher();
  const hidden = f.formData ? f.formData.get("hidden") === "true" : r.hidden;
  return (
    <tr className={`border-t border-line ${hidden ? "opacity-45" : ""}`}>
      <td className="p-3 font-semibold" dir="auto">
        {r.nickname}
      </td>
      <td className="p-3">{GAME[r.game] ?? r.game}</td>
      <td className="p-3 text-end font-bold tabular-nums">{r.score}</td>
      <td className="p-3 text-sand">{r.branch ? `${r.branch}${r.tableNo ? ` · table ${r.tableNo}` : ""}` : "website"}</td>
      <td className="p-3 text-sand">
        {new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Beirut", weekday: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(r.createdAt))}
      </td>
      <td className="p-3 text-end">
        <f.Form method="post">
          <input type="hidden" name="id" value={r.id} />
          <button name="hidden" value={hidden ? "false" : "true"} className="text-xs font-semibold text-amber underline">
            {hidden ? "Show" : "Hide"}
          </button>
        </f.Form>
      </td>
    </tr>
  );
}
