import { createHash, randomInt } from "node:crypto";
import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "~/db/client.server";
import { bookings, type Booking, type BookingStatus } from "~/db/schema";
import { LOCALES } from "./locale";
import { isUniqueViolation } from "./log.server";
import { hit } from "./rate-limit.server";
import { serverSecret } from "./secret.server";
import { addDays, beirutNowHM, beirutToday, isRealDate } from "./time";

export const BookingInput = z.object({
  branch: z.enum(["naccache", "faqra"]),
  date: z.string().refine(isRealDate, "date"),
  time: z.string().regex(/^(1[2-9]|2[0-3]):(00|30)$/),
  guests: z.coerce.number().int().min(1).max(12),
  seating: z.enum(["any", "counter", "indoor", "terrace"]),
  occasion: z.enum(["none", "birthday", "date", "business", "celebration"]),
  name: z.string().trim().min(1).max(80),
  phone: z
    .string()
    .trim()
    .max(30)
    .refine((v) => v.replace(/\D/g, "").length >= 7, "phone"),
  notes: z.string().trim().max(500).default(""),
  locale: z.enum(LOCALES),
  /** honeypot: real people never fill this in */
  website: z.string().max(0).optional().default(""),
});
export type BookingInput = z.infer<typeof BookingInput>;

export { beirutToday };

/** How far ahead guests can ask for a table. */
export const MAX_DAYS_AHEAD = 90;

/** Why a date/time can't be booked right now, or null when it can. */
export function bookingWindowError(date: string, time: string, now = new Date()): "pastDate" | "pastTime" | "tooFar" | null {
  const today = beirutToday(now);
  if (!isRealDate(date) || date < today) return "pastDate";
  if (date > addDays(today, MAX_DAYS_AHEAD)) return "tooFar";
  if (date === today && time <= beirutNowHM(now)) return "pastTime";
  return null;
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
function makeRef() {
  let s = "SF-";
  for (let i = 0; i < 4; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return s;
}

export function hashIp(ip: string) {
  return createHash("sha256").update(`${ip}:${serverSecret()}`).digest("hex").slice(0, 16);
}

export class RateLimitError extends Error {}

export const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

/** Max booking requests per connection per hour (a restaurant's Wi-Fi is shared by many guests, so not too low). */
const HOURLY_LIMIT = 10;

export async function createBooking(input: BookingInput, ip: string): Promise<Booking> {
  const db = await getDb();
  const ipHash = hashIp(ip);
  if (!(await hit(`book:${ipHash}`, HOURLY_LIMIT, 60))) throw new RateLimitError();

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const [row] = await db
        .insert(bookings)
        .values({
          ref: makeRef(),
          branch: input.branch,
          date: input.date,
          time: input.time,
          guests: input.guests,
          seating: input.seating,
          occasion: input.occasion,
          name: input.name,
          phone: input.phone,
          notes: input.notes,
          locale: input.locale,
          ipHash,
        })
        .returning();
      if (row) return row;
    } catch (e) {
      if (!isUniqueViolation(e)) throw e; // reference already taken: try another code
    }
  }
  throw new Error("Could not create a booking reference");
}

export async function getBooking(id: string): Promise<Booking | undefined> {
  if (!isUuid(id)) return undefined;
  const db = await getDb();
  const [row] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  return row;
}

export type BookingFilter = { branches: ("naccache" | "faqra")[]; view: "upcoming" | "today" | "past"; status?: BookingStatus };

export async function listBookings(f: BookingFilter): Promise<Booking[]> {
  const db = await getDb();
  const today = beirutToday();
  const conds = [inArray(bookings.branch, f.branches)];
  if (f.view === "today") conds.push(eq(bookings.date, today));
  if (f.view === "upcoming") conds.push(gte(bookings.date, today));
  if (f.view === "past") conds.push(sql`${bookings.date} < ${today}`);
  if (f.status) conds.push(eq(bookings.status, f.status));
  const order = f.view === "past" ? [desc(bookings.date), desc(bookings.time)] : [asc(bookings.date), asc(bookings.time)];
  return db
    .select()
    .from(bookings)
    .where(and(...conds))
    .orderBy(...order)
    .limit(300);
}

export async function setBookingStatus(id: string, status: BookingStatus, branches: string[]): Promise<Booking | undefined> {
  if (!isUuid(id)) return undefined;
  const db = await getDb();
  const [row] = await db
    .update(bookings)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(bookings.id, id), inArray(bookings.branch, branches)))
    .returning();
  return row;
}
