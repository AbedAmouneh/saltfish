/** Rejects cross-site posts: a present Origin header (including "null") must match this site. */
export function isForeignOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin");
  if (!origin) return false;
  try {
    return new URL(origin).host !== new URL(request.url).host;
  } catch {
    return true; // "null" (sandboxed frames, file://) or garbage
  }
}
