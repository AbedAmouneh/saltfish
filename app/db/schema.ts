import { boolean, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import type { BookingStatus } from "~/lib/booking-status";
export { BOOKING_STATUSES, type BookingStatus } from "~/lib/booking-status";

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Short code the guest and staff use, e.g. SF-7K3Q */
    ref: text("ref").notNull().unique(),
    branch: text("branch").notNull(),
    date: text("date").notNull(), // YYYY-MM-DD (Beirut)
    time: text("time").notNull(), // HH:MM
    guests: integer("guests").notNull(),
    seating: text("seating").notNull(), // any | counter | indoor | terrace
    occasion: text("occasion").notNull(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    notes: text("notes").notNull().default(""),
    locale: text("locale").notNull(),
    status: text("status").$type<BookingStatus>().notNull().default("pending"),
    ipHash: text("ip_hash").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("bookings_branch_date_idx").on(t.branch, t.date), index("bookings_created_idx").on(t.createdAt)],
);

export const feedback = pgTable(
  "feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branch: text("branch").notNull(),
    tableNo: integer("table_no").notNull(),
    rating: integer("rating").notNull(), // 1–5
    tags: text("tags").notNull().default(""), // comma-separated: food,service,vibe,speed,music
    comment: text("comment").notNull().default(""),
    locale: text("locale").notNull(),
    ipHash: text("ip_hash").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("feedback_branch_created_idx").on(t.branch, t.createdAt)],
);
export type Feedback = typeof feedback.$inferSelect;

export const scores = pgTable(
  "scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    game: text("game").notNull(),
    nickname: text("nickname").notNull(),
    score: integer("score").notNull(),
    branch: text("branch"),
    tableNo: integer("table_no"),
    hidden: boolean("hidden").notNull().default(false),
    ipHash: text("ip_hash").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("scores_game_score_idx").on(t.game, t.score), index("scores_created_idx").on(t.createdAt)],
);
export type Score = typeof scores.$inferSelect;

/** Generic rate-limit log (e.g. "salty:<ip-hash>"). Old rows are pruned automatically. */
export const rateEvents = pgTable(
  "rate_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("rate_events_key_created_idx").on(t.key, t.createdAt)],
);

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;

/**
 * Plain SQL so the table can be created without a migration tool.
 * Safe to run on every cold start (IF NOT EXISTS).
 */
export const CREATE_SQL = [
  `CREATE TABLE IF NOT EXISTS bookings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ref text NOT NULL UNIQUE,
    branch text NOT NULL,
    date text NOT NULL,
    time text NOT NULL,
    guests integer NOT NULL,
    seating text NOT NULL,
    occasion text NOT NULL,
    name text NOT NULL,
    phone text NOT NULL,
    notes text NOT NULL DEFAULT '',
    locale text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    ip_hash text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS bookings_branch_date_idx ON bookings (branch, date)`,
  `CREATE INDEX IF NOT EXISTS bookings_created_idx ON bookings (created_at)`,
  `CREATE TABLE IF NOT EXISTS feedback (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    branch text NOT NULL,
    table_no integer NOT NULL,
    rating integer NOT NULL,
    tags text NOT NULL DEFAULT '',
    comment text NOT NULL DEFAULT '',
    locale text NOT NULL,
    ip_hash text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS feedback_branch_created_idx ON feedback (branch, created_at)`,
  `CREATE TABLE IF NOT EXISTS scores (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    game text NOT NULL,
    nickname text NOT NULL,
    score integer NOT NULL,
    branch text,
    table_no integer,
    hidden boolean NOT NULL DEFAULT false,
    ip_hash text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS scores_game_score_idx ON scores (game, score)`,
  `CREATE INDEX IF NOT EXISTS scores_created_idx ON scores (created_at)`,
  `CREATE TABLE IF NOT EXISTS rate_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS rate_events_key_created_idx ON rate_events (key, created_at)`,
];
