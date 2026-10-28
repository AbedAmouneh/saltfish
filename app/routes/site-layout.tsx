import { Outlet } from "react-router";
import { SiteFooter } from "~/components/SiteFooter";
import { SiteHeader } from "~/components/SiteHeader";
import { SaltyLauncher } from "~/components/salty/SaltyLauncher";
import { useI18n } from "~/i18n";

export default function SiteLayout() {
  const { t } = useI18n();
  return (
    <>
      <a href="#main" className="sr-only z-50 rounded-full bg-amber px-4 py-2 font-bold text-night focus:not-sr-only focus:fixed focus:start-4 focus:top-4">
        {t.common.skip}
      </a>
      <SiteHeader />
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <SiteFooter />
      <SaltyLauncher />
    </>
  );
}
