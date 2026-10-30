import { Form, Link, NavLink, Outlet, useLoaderData, type LoaderFunctionArgs, type MetaFunction } from "react-router";
import { Logo } from "~/components/Logo";
import { getStaffScope } from "~/lib/staff.server";

export const meta: MetaFunction = () => [{ title: "Staff | Saltfish" }, { name: "robots", content: "noindex, nofollow" }];

export async function loader({ request }: LoaderFunctionArgs) {
  return { scope: await getStaffScope(request) };
}

const SCOPE_LABEL = { all: "All branches", naccache: "Naccache", faqra: "Faqra" } as const;

export default function StaffLayout() {
  const { scope } = useLoaderData<typeof loader>();
  return (
    <div className="min-h-dvh bg-night">
      <header className="print:hidden sticky top-0 z-30 border-b border-line bg-night/95 pt-[env(safe-area-inset-top,0px)] backdrop-blur">
        {/* Phones: logo + log out on top, the section links on their own row below */}
        <div className="gutter mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 py-3 md:h-16 md:flex-nowrap md:py-0">
          <Link to="/staff" className="text-2xl text-cream" aria-label="Saltfish staff">
            <Logo />
          </Link>
          <span className="rounded-full bg-coal px-3 py-1 text-xs font-bold tracking-wide text-sand uppercase">Staff</span>
          {scope ? (
            <>
              <nav aria-label="Staff" className="order-last w-full overflow-x-auto md:order-none md:ms-auto md:w-auto">
                <ul className="flex justify-between gap-1 text-sm font-semibold whitespace-nowrap md:justify-start">
                  {[
                    ["/staff", "Bookings"],
                    ["/staff/feedback", "Feedback"],
                    ["/staff/qr", "QR codes"],
                    ["/staff/scores", "Scores"],
                  ].map(([to, label]) => (
                    <li key={to}>
                      <NavLink
                        to={to!}
                        end
                        className={({ isActive }) => `block rounded-full px-2.5 py-2 md:px-3 ${isActive ? "bg-cream text-night" : "text-sand hover:text-cream"}`}
                      >
                        {label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </nav>
              <span className="hidden text-sm text-sand md:inline">{SCOPE_LABEL[scope]}</span>
              <Form method="post" action="/staff/logout" className="ms-auto md:ms-0">
                <button className="btn btn-ghost !min-h-10 !px-4 text-sm">Log out</button>
              </Form>
            </>
          ) : null}
        </div>
      </header>
      <main className="gutter mx-auto max-w-6xl py-8">
        <Outlet />
      </main>
    </div>
  );
}
