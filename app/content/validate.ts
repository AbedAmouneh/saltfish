/**
 * Build-time content validation. Runs during `npm run build` (from
 * react-router.config.ts) and `npm run content:check`. It is not shipped
 * to the browser, so zod stays out of the client bundle.
 */
import { z } from "zod";
import branchesJson from "./branches.json";
import drinksJson from "./drinks.json";
import eventsJson from "./events.json";
import { ImageManifest } from "./images";
import imagesJson from "./images.json";
import menuJson from "./menu.json";
import { Branches, Drinks, Events, Menu, Site, Trivia } from "./schema";
import triviaJson from "./trivia.json";
import siteJson from "./site.json";

function parse<S extends z.ZodType>(name: string, schema: S, value: unknown): z.infer<S> {
  const result = schema.safeParse(value);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Content file app/content/${name} is invalid:\n${issues}`);
  }
  return result.data;
}

export function validateContent(): void {
  parse("site.json", Site, siteJson);
  parse("trivia.json", Trivia, triviaJson);
  const menu = parse("menu.json", Menu, menuJson);
  const drinks = parse("drinks.json", Drinks, drinksJson);
  const events = parse("events.json", Events, eventsJson);
  const branches = parse("branches.json", Branches, branchesJson).branches;
  const images = parse("images.json", ImageManifest, imagesJson);

  const problems: string[] = [];
  const has = (slug: string | null | undefined, where: string) => {
    if (slug && !images[slug])
      problems.push(`${where} uses photo "${slug}" which is not in images.json (add it to scripts/photo-sources.json and run npm run images)`);
  };
  const ids = new Set<string>();
  for (const c of menu.categories) {
    has(c.photo, `menu category ${c.id}`);
    for (const i of c.items) {
      has(i.photo, `menu item ${i.id}`);
      if (ids.has(i.id)) problems.push(`menu item id "${i.id}" is used twice`);
      ids.add(i.id);
    }
  }
  for (const s of drinks.sections) {
    has(s.photo, `drinks section ${s.id}`);
    for (const g of s.groups) for (const i of g.items) has(i.photo, `drink ${i.id}`);
  }
  for (const b of branches) {
    has(b.photo, `branch ${b.id}`);
    b.gallery.forEach((g) => has(g, `branch ${b.id} gallery`));
  }
  for (const r of events.rituals) has(r.photo, `ritual ${r.id}`);
  for (const e of events.oneOff) has(e.photo, `event ${e.id}`);
  if (problems.length) throw new Error(`Content problems:\n  - ${problems.join("\n  - ")}`);
}
