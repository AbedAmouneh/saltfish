import { branches, drinks, events, menu, site } from "~/content";
import { getDict } from "~/i18n";

let cache: string | undefined;

const money = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(1)}`;

/**
 * Everything Salty is allowed to know, generated from the same JSON the
 * website uses, so the bot never drifts from the menu or the hours.
 */
export function knowledgePack(): string {
  if (cache) return cache;
  const en = getDict("en");
  const out: string[] = [];

  out.push(`# Saltfish
${site.tagline.en}. Lebanese & Mediterranean flavours with a Japanese raw bar and a live hand roll counter.
Founded ${site.founded} on Armenia Street, Mar Mikhael (Beirut) as "Salt Fish in the city". Summers 2024 and 2025 at Faqra Club. Moved to Zero 4, Naccache in November 2025. New Faqra location in 2026.
Instagram: @saltfish.lb. Curated Spotify playlist: ${site.spotifyPlaylist}
Price range: ${site.priceRange}. Prices are in US dollars. Dine-in only: no delivery, no online ordering. Orders are taken by the waiter.
Website pages: /menu, /menu/drinks, /naccache, /faqra, /events, /story, /book (booking request, confirmed by the team on WhatsApp).`);

  out.push("# Branches");
  for (const b of branches) {
    out.push(`## ${b.name} (${b.venue.en})
Address: ${b.address.display.en}${b.id === "faqra" ? " (exact address to be confirmed with the team)" : ""}
Hours: ${b.hours.map((h) => `${h.days.length === 7 ? "every day" : h.days.join(", ")} ${h.opens}–${h.closes === "24:00" ? "midnight" : h.closes}`).join("; ")}
Phone: ${b.phones.join(" / ")}. WhatsApp: +${b.whatsapp}
Seating: ${b.seating.join(", ")} (the hand roll counter is best for two; terrace is the calmer choice for lunch)
Highlights: ${b.highlights.map((h) => en.branch.highlights[h]).join(", ")}
About: ${b.blurb.en}
Booking link: /book?branch=${b.id}`);
  }

  out.push("# Food menu (dish name — price — portion — description — tags)");
  for (const c of menu.categories) {
    out.push(`## ${c.name.en}${c.note ? ` (${c.note.en})` : ""}`);
    for (const i of c.items) {
      const bits = [i.name, money(i.price)];
      if (i.portion) bits.push(i.portion.en);
      if (i.desc) bits.push(i.desc.en);
      if (i.note) bits.push(i.note.en);
      if (i.tags.length) bits.push(`[${i.tags.join(", ")}]`);
      out.push(`- ${bits.join(" — ")}`);
    }
  }

  out.push("# Drinks (name — bottle/serving price — glass price if sold by the glass — description)");
  for (const s of drinks.sections) {
    out.push(`## ${s.name.en}`);
    for (const g of s.groups) {
      if (s.groups.length > 1) out.push(`### ${g.name.en}`);
      for (const d of g.items) {
        const bits = [d.name, money(d.price)];
        if (d.glass !== undefined) bits.push(`glass ${money(d.glass)}`);
        if (d.desc) bits.push(d.desc.en);
        if (d.tags?.length) bits.push(`[${d.tags.join(", ")}]`);
        out.push(`- ${bits.join(" — ")}`);
      }
    }
  }

  out.push("# Weekly rituals & events");
  for (const r of events.rituals) {
    const when = r.days.length ? r.days.join(", ") : "big match days";
    const time = r.start === "sunset" ? "from sunset" : r.start ? `from ${r.start}${r.end ? ` to ${r.end}` : ""}` : "";
    out.push(
      `- ${r.title} — ${r.branch === "both" ? "both branches" : r.branch} — ${when} ${time}${r.price ? ` — ${money(r.price)}` : ""} — ${r.summary.en}${r.note ? ` ${r.note.en}` : ""}`,
    );
  }
  for (const e of events.oneOff) {
    out.push(`- ${e.title} — ${e.branch} — ${e.date}${e.start ? ` ${e.start}` : " (time to be announced)"} — ${e.summary.en}`);
  }

  out.push(`# House rules & fun facts
${en.story.rules.map((r) => `- ${r}`).join("\n")}
- Hand rolls are made to be eaten straight away while the nori is crisp; sit at the counter to watch them being rolled.
- Branded chopstick holders (panda, crab, cat, watermelon, tomato). Merch is sold in Faqra.
- Guest favourites in reviews: oysters (often called the freshest in Lebanon), salmon and tuna hand rolls, the Tomatini, Zaatar White Fish Tiradito, Provençal Shrimp, the Caviar Fish Burger.
- Allergen information per dish is not published yet: always tell guests to check with their waiter.`);

  cache = out.join("\n");
  return cache;
}
