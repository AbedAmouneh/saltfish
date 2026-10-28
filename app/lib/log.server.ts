/**
 * Logs a server error without guest data. Database errors from drizzle repeat the
 * query parameters (names, phone numbers) in their message, so only the
 * underlying driver error and its Postgres code are written to the logs.
 */
export function logError(label: string, e: unknown) {
  const cause = (e as { cause?: unknown })?.cause;
  const inner = (cause ?? e) as { name?: string; message?: string; code?: string };
  const message = String(inner?.message ?? e)
    .split("\nparams:")[0]!
    .replace(/params: .*/s, "")
    .slice(0, 300);
  console.error(`${label}: ${inner?.name ?? "Error"}${inner?.code ? ` [${inner.code}]` : ""} ${message}`);
}

/** True for a Postgres unique-constraint violation, however the driver wraps it. */
export function isUniqueViolation(e: unknown): boolean {
  for (let x: unknown = e, i = 0; x && i < 4; x = (x as { cause?: unknown }).cause, i++) {
    if ((x as { code?: string }).code === "23505") return true;
  }
  return false;
}
