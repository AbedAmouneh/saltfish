import { NavLink } from "react-router";
import { useI18n } from "~/i18n";

export function MenuTabs() {
  const { t, href } = useI18n();
  const tab = ({ isActive }: { isActive: boolean }) =>
    `rounded-full px-5 py-2.5 text-sm font-bold transition-colors ${isActive ? "bg-cream text-night" : "text-sand hover:text-cream"}`;
  return (
    <nav aria-label={t.menu.title} className="justify-self-start">
      <ul className="flex rounded-full border border-line bg-coal p-1">
        <li>
          <NavLink to={href("/menu")} end className={tab}>
            {t.menu.tabs.food}
          </NavLink>
        </li>
        <li>
          <NavLink to={href("/menu/drinks")} className={tab}>
            {t.menu.tabs.drinks}
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}

/** Horizontal, sticky list of section links. */
export function SectionRail({ sections, label }: { sections: { id: string; name: string }[]; label: string }) {
  return (
    <nav
      aria-label={label}
      className="sticky top-[calc(4rem+env(safe-area-inset-top,0px))] z-30 border-y border-line bg-night/92 backdrop-blur-md md:top-[calc(5rem+env(safe-area-inset-top,0px))]"
    >
      <ul className="gutter container-x flex gap-1 overflow-x-auto py-2 [scrollbar-width:none]">
        {sections.map((s) => (
          <li key={s.id} className="shrink-0">
            <a href={`#${s.id}`} className="block rounded-full px-3.5 py-2 text-sm font-semibold whitespace-nowrap text-sand hover:bg-coal hover:text-cream">
              {s.name}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
