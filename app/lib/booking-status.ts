/** Shared by the database schema and the browser (no database code here). */
export const BOOKING_STATUSES = ["pending", "confirmed", "declined", "cancelled"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];
