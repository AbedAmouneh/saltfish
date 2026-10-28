import { Link, useLocation } from "react-router";
import { useI18n } from "~/i18n";
import { LOCALES, LOCALE_META, localizePath, stripLocale } from "~/lib/locale";

export function LanguageSwitch({ className = "" }: { className?: string }) {
  const { pathname, hash } = useLocation();
  const { locale, t } = useI18n();
  const base = stripLocale(pathname);
  return (
    <div className={className}>
      <ul aria-label={t.common.language} className="flex items-center rounded-full border border-line p-0.5 text-[0.8rem] font-bold">
        {LOCALES.map((l) => {
          const active = l === locale;
          return (
            <li key={l}>
              <Link
                to={`${localizePath(base, l)}${hash}`}
                hrefLang={LOCALE_META[l].hreflang}
                lang={LOCALE_META[l].hreflang}
                aria-current={active ? "true" : undefined}
                title={LOCALE_META[l].label}
                className={`grid h-8 min-w-9 place-items-center rounded-full px-2.5 transition-colors ${
                  active ? "bg-cream text-night" : "text-sand hover:text-cream"
                }`}
              >
                {LOCALE_META[l].short}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
