import type { Branch } from "~/content/schema";
import { formatDate, formatTime, getDict } from "~/i18n";
import type { Locale } from "./locale";

export type BookingDetails = {
  ref?: string;
  branch: Branch;
  date: string;
  time: string;
  guests: number;
  seating: "any" | "counter" | "indoor" | "terrace";
  occasion: "none" | "birthday" | "date" | "business" | "celebration";
  name: string;
  phone: string;
  notes: string;
};

/** The WhatsApp message a guest sends to the restaurant, in the guest's language. */
export function guestMessage(b: BookingDetails, locale: Locale): string {
  const t = getDict(locale);
  const m = t.book.message;
  const lines = [
    m.greeting,
    "",
    b.ref ? `${m.ref}: ${b.ref}` : null,
    `${m.branch}: ${b.branch.name}`,
    `${m.date}: ${formatDate(b.date, locale)}`,
    `${m.time}: ${formatTime(b.time, locale)}`,
    `${m.guests}: ${b.guests}`,
    `${m.seating}: ${b.seating === "any" ? t.book.seatingAny : t.branch.seatingTypes[b.seating].title}`,
    b.occasion !== "none" ? `${m.occasion}: ${t.book.occasions[b.occasion]}` : null,
    `${m.name}: ${b.name.trim()}`,
    `${m.phone}: ${b.phone.trim()}`,
    b.notes.trim() ? `${m.notes}: ${b.notes.trim()}` : null,
  ];
  return lines.filter((l) => l !== null).join("\n");
}

/** The WhatsApp reply staff send back to the guest, in the guest's language. */
export function staffReply(
  status: "confirmed" | "declined",
  b: { name: string; branch: Branch; date: string; time: string; guests: number; ref: string },
  locale: Locale,
  statusUrl: string,
): string {
  const t = getDict(locale);
  const args = {
    name: b.name.split(" ")[0] ?? b.name,
    branch: b.branch.name,
    date: formatDate(b.date, locale),
    time: formatTime(b.time, locale),
    guests: b.guests,
    ref: b.ref,
    url: statusUrl,
  };
  return status === "confirmed" ? t.book.reply.confirmed(args) : t.book.reply.declined(args);
}
