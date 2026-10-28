import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { useI18n } from "~/i18n";
import { LanguageSwitch } from "./LanguageSwitch";
import { Logo } from "./Logo";

export function SiteHeader() {
  const { t, href } = useI18n();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const items = [
    { to: href("/menu"), label: t.common.nav.menu },
    { to: href("/naccache"), label: t.common.nav.naccache },
    { to: href("/faqra"), label: t.common.nav.faqra },
    { to: href("/events"), label: t.common.nav.events },
    { to: href("/play"), label: t.common.nav.play },
    { to: href("/story"), label: t.common.nav.story },
  ];

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 pt-[env(safe-area-inset-top,0px)] transition-[background-color,box-shadow,backdrop-filter] duration-300 ${
        solid || open ? "bg-night/88 shadow-[0_1px_0_var(--color-line)] backdrop-blur-md" : "bg-transparent"
      }`}
    >
      <div className="gutter container-x flex h-16 items-center gap-6 md:h-20">
        <Link to={href("/")} className="text-[1.45rem] text-cream md:text-[1.7rem]" aria-label="Saltfish">
          <Logo />
        </Link>

        <nav aria-label={t.common.nav.primary} className="ms-auto hidden lg:block">
          <ul className="flex items-center gap-1">
            {items.map((it) => (
              <li key={it.to}>
                <NavLink
                  to={it.to}
                  end={!(it.to.endsWith("/menu") || it.to.endsWith("/play"))}
                  className={({ isActive }) =>
                    `rounded-full px-3.5 py-2 text-[0.95rem] font-semibold transition-colors ${isActive ? "text-amber" : "text-sand hover:text-cream"}`
                  }
                >
                  {it.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <LanguageSwitch className="ms-auto hidden sm:block lg:ms-0" />
        <Link to={href("/book")} className="btn btn-primary hidden !min-h-11 sm:inline-flex">
          {t.common.nav.book}
        </Link>

        <button
          type="button"
          className="ms-auto grid size-11 place-items-center rounded-full border border-line text-cream sm:ms-0 lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">{open ? t.common.nav.close : t.common.nav.open}</span>
          <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <path d="M4 8h16M4 16h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      <div
        id="mobile-nav"
        hidden={!open}
        className="gutter h-[calc(100dvh-4rem)] overflow-y-auto border-t border-line bg-night pb-[max(2rem,env(safe-area-inset-bottom,0px))] lg:hidden"
      >
        <nav aria-label={t.common.nav.primary} className="container-x pt-6">
          <ul className="grid gap-1">
            {items.map((it) => (
              <li key={it.to}>
                <NavLink to={it.to} className={({ isActive }) => `display block py-2 text-5xl ${isActive ? "text-amber" : "text-cream"}`}>
                  {it.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link to={href("/book")} className="btn btn-primary">
              {t.common.nav.book}
            </Link>
            <LanguageSwitch />
          </div>
        </nav>
      </div>
    </header>
  );
}
