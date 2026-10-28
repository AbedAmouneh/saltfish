/**
 * All site content lives in the JSON files in this folder.
 * Edit the JSON, run `npm run content:check`, then redeploy.
 * The files are validated against ./schema.ts at build time (see ./validate.ts),
 * so a typo fails the build instead of breaking a page in production.
 */
import branchesJson from "./branches.json";
import drinksJson from "./drinks.json";
import eventsJson from "./events.json";
import type { ImageEntry } from "./images";
import imagesJson from "./images.json";
import menuJson from "./menu.json";
import type { Branch, BranchId, Drinks, Menu, OneOffEvent, Ritual, Site, Trivia } from "./schema";
import siteJson from "./site.json";
import triviaJson from "./trivia.json";

export const site = siteJson as unknown as Site;
export const menu = menuJson as unknown as Menu;
export const drinks = drinksJson as unknown as Drinks;
export const events = eventsJson as unknown as { rituals: Ritual[]; oneOff: OneOffEvent[] };
export const branches = (branchesJson as unknown as { branches: Branch[] }).branches;
export const trivia = triviaJson as unknown as Trivia;
export const images = imagesJson as unknown as Record<string, ImageEntry>;

export function getBranch(id: BranchId): Branch {
  const b = branches.find((x) => x.id === id);
  if (!b) throw new Error(`Unknown branch ${id}`);
  return b;
}
