import type { Config } from "@react-router/dev/config";
import { vercelPreset } from "@vercel/react-router/vite";
import { validateContent } from "./app/content/validate";
import { prerenderPaths } from "./app/lib/paths";

// Fail the build early if any content JSON is invalid.
validateContent();

export default {
  // SSR stays on so that future API routes (bookings, Salty, scores) run as
  // Vercel Node functions. Every public page is prerendered to static HTML
  // for speed and SEO.
  ssr: true,
  // The Vercel preset only on Vercel; locally the build lands in build/server/index.js for `npm start`.
  presets: process.env.VERCEL ? [vercelPreset()] : [],
  async prerender() {
    return prerenderPaths();
  },
} satisfies Config;
