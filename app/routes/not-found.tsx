import { Link, data, type MetaFunction } from "react-router";
import { SiteFooter } from "~/components/SiteFooter";
import { SiteHeader } from "~/components/SiteHeader";
import { getDict, useI18n } from "~/i18n";
import { localeFromPath } from "~/lib/locale";

export function loader() {
  // Real 404 status so search engines don't index unknown URLs.
  return data(null, { status: 404 });
}

export const meta: MetaFunction = ({ location }) => {
  const t = getDict(localeFromPath(location.pathname));
  return [{ title: t.notFound.metaTitle }, { name: "robots", content: "noindex" }];
};

export default function NotFound() {
  const { t, href } = useI18n();
  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="gutter grid min-h-[80dvh] place-items-center pt-24 text-center">
        <div className="grid justify-items-center gap-5">
          <p className="eyebrow">404</p>
          <h1 className="display text-[clamp(3.5rem,10vw,8rem)]">{t.notFound.title}</h1>
          <p className="max-w-md text-lg text-sand">{t.notFound.body}</p>
          <Link to={href("/")} className="btn btn-primary">
            {t.notFound.cta}
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
