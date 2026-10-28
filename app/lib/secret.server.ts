/**
 * The one server secret (SESSION_SECRET). It signs staff sessions and game tickets
 * and salts IP hashes, so production refuses to run those features without it.
 */
export function serverSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET is not set");
  return "dev-only-secret-change-me";
}
