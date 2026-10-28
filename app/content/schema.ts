import { z } from "zod";

/** Text in all three site languages. */
export const L10n = z.object({ en: z.string().min(1), ar: z.string().min(1), fr: z.string().min(1) });
export type L10n = z.infer<typeof L10n>;

const slug = z.string().regex(/^[a-z0-9-]+$/, "use lowercase letters, numbers and dashes");
const price = z.number().nonnegative();
const time = z.string().regex(/^([01]\d|2[0-4]):[0-5]\d$/, "use 24h HH:MM");
const day = z.enum(["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]);

export const MenuTag = z.enum(["raw", "vegetarian", "spicy", "signature", "favorite"]);
export type MenuTag = z.infer<typeof MenuTag>;

export const MenuItem = z.object({
  id: slug,
  name: z.string().min(1),
  desc: L10n.nullable(),
  price,
  portion: L10n.nullable(),
  tags: z.array(MenuTag),
  note: L10n.optional(),
  photo: slug.nullable(),
});
export type MenuItem = z.infer<typeof MenuItem>;

export const Menu = z.object({
  currency: z.literal("USD"),
  source: z.string(),
  categories: z.array(
    z.object({
      id: slug,
      name: L10n,
      note: L10n.optional(),
      photo: slug.nullable(),
      items: z.array(MenuItem).min(1),
    }),
  ),
});
export type Menu = z.infer<typeof Menu>;

export const Drink = z.object({
  id: slug,
  name: z.string().min(1),
  price,
  glass: price.optional(),
  desc: L10n.optional(),
  tags: z.array(MenuTag).optional(),
  photo: slug.optional(),
});
export type Drink = z.infer<typeof Drink>;

export const Drinks = z.object({
  currency: z.literal("USD"),
  source: z.string(),
  sections: z.array(
    z.object({
      id: slug,
      name: L10n,
      photo: slug.nullable(),
      priceLabels: z.boolean().optional(),
      groups: z.array(z.object({ id: slug, name: L10n, items: z.array(Drink).min(1) })),
    }),
  ),
});
export type Drinks = z.infer<typeof Drinks>;

export const Seating = z.enum(["counter", "indoor", "terrace"]);
export type Seating = z.infer<typeof Seating>;

export const Branch = z.object({
  id: z.enum(["naccache", "faqra"]),
  name: z.string(),
  short: L10n,
  venue: L10n,
  blurb: L10n,
  address: z.object({
    street: z.string(),
    locality: z.string(),
    region: z.string(),
    country: z.literal("LB"),
    display: L10n,
  }),
  geo: z.object({ lat: z.number(), lng: z.number() }),
  phones: z.array(z.string()).min(1),
  whatsapp: z.string().regex(/^961\d{7,8}$/, "international format without +, e.g. 9613374344"),
  hours: z.array(z.object({ days: z.array(day).min(1), opens: time, closes: time })),
  googlePlaceId: z.string(),
  seating: z.array(Seating),
  tables: z.number().int().positive(),
  photo: slug,
  gallery: z.array(slug),
  highlights: z.array(z.enum(["counter", "terrace", "dj", "screenings", "merch"])),
});
export type Branch = z.infer<typeof Branch>;
export type BranchId = Branch["id"];

export const Branches = z.object({ branches: z.array(Branch).length(2) });

export const Ritual = z.object({
  id: slug,
  title: z.string(),
  branch: z.enum(["naccache", "faqra", "both"]),
  days: z.array(day),
  start: z.union([time, z.literal("sunset")]).nullable(),
  end: time.nullable(),
  price: price.optional(),
  photo: slug,
  summary: L10n,
  note: L10n.nullable(),
});
export type Ritual = z.infer<typeof Ritual>;

export const OneOffEvent = z.object({
  id: slug,
  title: z.string(),
  branch: z.enum(["naccache", "faqra", "both"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start: time.nullable(),
  photo: slug,
  summary: L10n,
  confirmed: z.boolean(),
});
export type OneOffEvent = z.infer<typeof OneOffEvent>;

export const Events = z.object({ rituals: z.array(Ritual), oneOff: z.array(OneOffEvent) });

export const Site = z.object({
  name: z.string(),
  legalName: z.string(),
  tagline: L10n,
  url: z.url(),
  instagram: z.url(),
  spotifyPlaylist: z.url(),
  spotifyEmbed: z.url(),
  priceRange: z.string(),
  servesCuisine: z.array(z.string()),
  founded: z.string(),
});
export type Site = z.infer<typeof Site>;

export const Trivia = z.object({
  terms: z.array(z.object({ term: z.string().min(1), origin: z.enum(["lebanese", "japanese"]) })).min(4),
  facts: z.array(z.object({ statement: L10n, answer: z.boolean() })).min(4),
});
export type Trivia = z.infer<typeof Trivia>;
