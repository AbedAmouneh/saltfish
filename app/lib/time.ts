/**
 * Beirut time helpers, safe on the server and in the browser.
 * Lebanon switches between UTC+3 (summer) and UTC+2 (winter), so offsets are
 * always looked up for the actual date instead of being hard-coded.
 */
const TZ = "Asia/Beirut";

/** Today's date in Beirut, YYYY-MM-DD. */
export function beirutToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now);
}

/** Current time in Beirut, HH:MM (24 h). */
export function beirutNowHM(now = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
}

/** Beirut's UTC offset on a given local date and time, e.g. "+02:00". */
export function beirutOffset(date: string, time = "12:00"): string {
  const guess = new Date(`${date}T${time}:00Z`);
  const part = new Intl.DateTimeFormat("en-US", { timeZone: TZ, timeZoneName: "longOffset" }).formatToParts(guess).find((p) => p.type === "timeZoneName");
  const m = part?.value.match(/GMT([+-]\d{2}):?(\d{2})?/);
  return m ? `${m[1]}:${m[2] ?? "00"}` : "+02:00";
}

/** ISO 8601 with the correct Beirut offset, e.g. 2026-10-31T21:00:00+02:00 */
export function beirutIso(date: string, time: string): string {
  return `${date}T${time}:00${beirutOffset(date, time)}`;
}

/** True when YYYY-MM-DD is a real calendar date (rejects 2026-02-31). */
export function isRealDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const d = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date;
}

/** Adds days to a YYYY-MM-DD date. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const icsStamp = (d: Date) =>
  d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/**
 * A one-event .ics file as a data: URL. Times are written in UTC so every calendar app agrees.
 * `stamp` must be stable (not "now") so the server and browser render the same link.
 */
export function icsDataUrl(e: {
  uid: string;
  stamp: Date;
  date: string;
  time?: string | null;
  minutes?: number;
  summary: string;
  location: string;
  description?: string;
}) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Saltfish//Website//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${e.uid}`,
    `DTSTAMP:${icsStamp(e.stamp)}`,
  ];
  if (e.time) {
    const start = new Date(beirutIso(e.date, e.time));
    const end = new Date(start.getTime() + (e.minutes ?? 120) * 60_000);
    lines.push(`DTSTART:${icsStamp(start)}`, `DTEND:${icsStamp(end)}`);
  } else {
    lines.push(`DTSTART;VALUE=DATE:${e.date.replaceAll("-", "")}`, `DTEND;VALUE=DATE:${addDays(e.date, 1).replaceAll("-", "")}`);
  }
  lines.push(`SUMMARY:${icsText(e.summary)}`, `LOCATION:${icsText(e.location)}`);
  if (e.description) lines.push(`DESCRIPTION:${icsText(e.description)}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join("\r\n"))}`;
}
