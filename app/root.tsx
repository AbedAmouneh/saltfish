import "@fontsource/big-shoulders-display/800";
import "@fontsource/big-shoulders-display/900";
import "@fontsource-variable/instrument-sans";
import "./app.css";
import displayFont from "@fontsource/big-shoulders-display/files/big-shoulders-display-latin-900-normal.woff2?url";
import bodyFont from "@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2?url";
import arabicFont from "./fonts/noto-kufi-arabic-subset.woff2?url";

import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration, useLocation, type LinksFunction } from "react-router";
import { LOCALE_META, localeFromPath } from "./lib/locale";

export const links: LinksFunction = () => [
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
  { rel: "icon", href: "/favicon-32.png", sizes: "32x32", type: "image/png" },
  { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
  { rel: "manifest", href: "/site.webmanifest" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const locale = localeFromPath(pathname);
  const { dir, hreflang } = LOCALE_META[locale];
  return (
    <html lang={hreflang} dir={dir}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#120b08" />
        <meta name="format-detection" content="telephone=no" />
        <Meta />
        {/* Preload the fonts the first screen needs so text doesn't jump when they arrive */}
        <link rel="preload" href={displayFont} as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href={locale === "ar" ? arabicFont : bodyFont} as="font" type="font/woff2" crossOrigin="anonymous" />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: { error: unknown }) {
  const status = isRouteErrorResponse(error) ? error.status : 500;
  const message = isRouteErrorResponse(error) ? error.statusText : error instanceof Error ? error.message : "Unknown error";
  return (
    <main className="gutter grid min-h-dvh place-items-center text-center">
      <div className="grid gap-4">
        <p className="eyebrow">Error {status}</p>
        <h1 className="display text-6xl">Something went wrong</h1>
        {import.meta.env.DEV ? <pre className="text-sand text-sm whitespace-pre-wrap">{message}</pre> : null}
        <a className="btn btn-primary justify-self-center" href="/">
          Saltfish home
        </a>
      </div>
    </main>
  );
}
