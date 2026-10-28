import type { Ritual } from "~/content/schema";
import { formatTime } from "~/i18n";
import type { Dict } from "~/i18n/en";
import type { Locale } from "./locale";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr"];

/** "Saturday · from 1 PM", "Monday to Friday · 12 PM – 6 PM", "Friday, Saturday · from sunset" */
export function ritualWhen(r: Ritual, t: Dict, locale: Locale): string {
  const days =
    r.days.length === 7
      ? t.days.everyDay
      : r.days.length === 5 && WEEKDAYS.every((d) => r.days.includes(d as Ritual["days"][number]))
        ? t.days.weekdays
        : r.days.map((d) => t.days[d]).join(locale === "ar" ? "، " : ", ");
  let time = "";
  if (r.start === "sunset") time = `${t.events.from} ${t.events.sunset}`;
  else if (r.start && r.end) time = `${formatTime(r.start, locale)} – ${formatTime(r.end, locale)}`;
  else if (r.start) time = `${t.events.from} ${formatTime(r.start, locale)}`;
  if (!days && !time) return t.events.matchDays;
  return [days, time].filter(Boolean).join(" · ");
}
