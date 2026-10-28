import QRCode from "qrcode";
import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { Logo } from "~/components/Logo";
import { branches, site } from "~/content";
import { branchesFor, requireStaff } from "~/lib/staff.server";

/** Printable QR codes, one per table, pointing at /t/<branch>/<table> on the live domain. */
export async function loader({ request }: LoaderFunctionArgs) {
  const scope = await requireStaff(request);
  const url = new URL(request.url);
  // ?base= is only for printing test codes from a preview deployment: this site or the real domain only
  const asked = url.searchParams.get("base")?.replace(/\/$/, "");
  const base = asked && [url.origin, site.url.replace(/\/$/, "")].includes(asked) ? asked : site.url.replace(/\/$/, "");
  const visible = branches.filter((b) => (branchesFor(scope) as string[]).includes(b.id));
  const sheets = await Promise.all(
    visible.map(async (b) => ({
      id: b.id,
      name: b.name,
      codes: await Promise.all(
        Array.from({ length: b.tables }, async (_, i) => {
          const link = `${base}/t/${b.id}/${i + 1}`;
          const svg = await QRCode.toString(link, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#120b08", light: "#ffffff" } });
          return { table: i + 1, link, svg };
        }),
      ),
    })),
  );
  return { sheets, base };
}

export default function StaffQr() {
  const { sheets, base } = useLoaderData<typeof loader>();
  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div>
          <h1 className="display text-6xl">Table QR codes</h1>
          <p className="text-sand">
            Each code opens the menu, "My picks" and feedback for that table. Links point to <span className="font-mono text-cream">{base}</span>. Table counts
            come from <span className="font-mono">branches.json</span>.
          </p>
        </div>
        <button type="button" onClick={() => window.print()} className="btn btn-primary">
          Print
        </button>
      </div>
      {sheets.map((s) => (
        <section key={s.id} className="grid gap-4 break-after-page">
          <h2 className="eyebrow">{s.name}</h2>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-3">
            {s.codes.map((c) => (
              <li key={c.table} className="grid break-inside-avoid justify-items-center gap-2 rounded-2xl bg-white p-4 text-center text-night">
                <span className="text-2xl text-night">
                  <Logo dot="#e9702a" />
                </span>
                <div className="w-full max-w-[11rem] [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: c.svg }} />
                <p className="display text-3xl">Table {c.table}</p>
                <p className="text-[0.7rem] leading-snug font-semibold">
                  Scan for the menu &amp; feedback
                  <br />
                  <span lang="ar" dir="rtl" className="font-arabic">
                    امسح للمنيو ورأيك
                  </span>
                  <br />
                  <span lang="fr">Scannez pour la carte &amp; votre avis</span>
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
