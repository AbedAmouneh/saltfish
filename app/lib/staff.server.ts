import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { createCookieSessionStorage, redirect } from "react-router";
import { site } from "~/content";

type Scope = "all" | "naccache" | "faqra";

const isProd = process.env.NODE_ENV === "production";
const secret = process.env.SESSION_SECRET ?? (isProd ? undefined : "dev-only-secret-change-me");
if (isProd && !secret) console.warn("SESSION_SECRET is not set: staff login is disabled.");

const SHIFT_SECONDS = 60 * 60 * 12; // one shift

let storageCache: ReturnType<typeof makeStorage> | undefined;
const storage = () => (storageCache ??= makeStorage());
const makeStorage = () =>
  createCookieSessionStorage<{ scope: Scope; iat: number; pw: string }>({
    cookie: {
      name: "__saltfish_staff",
      httpOnly: true,
      sameSite: "lax",
      path: "/", // "/staff" would miss React Router data requests like /staff.data
      secure: isProd,
      maxAge: SHIFT_SECONDS,
      secrets: secret ? [secret] : [],
    },
  });

/**
 * Staff passwords come from environment variables:
 *   STAFF_PASSWORD           → sees both branches (managers)
 *   STAFF_PASSWORD_NACCACHE  → Naccache only
 *   STAFF_PASSWORD_FAQRA     → Faqra only
 * In local development, "saltfish-dev" works when none are set.
 */
function passwords(): [string, Scope][] {
  const list: [string | undefined, Scope][] = [
    [process.env.STAFF_PASSWORD, "all"],
    [process.env.STAFF_PASSWORD_NACCACHE, "naccache"],
    [process.env.STAFF_PASSWORD_FAQRA, "faqra"],
  ];
  const set = list.filter((x): x is [string, Scope] => !!x[0]);
  if (!set.length && !isProd) return [["saltfish-dev", "all"]];
  return set;
}

const digest = (s: string) => createHash("sha256").update(s).digest();

export function scopeForPassword(input: string): Scope | null {
  const d = digest(input);
  for (const [pw, scope] of passwords()) {
    if (timingSafeEqual(d, digest(pw))) return scope;
  }
  return null;
}

/**
 * A fingerprint of the password a session was opened with. Changing that password
 * in Vercel signs out everyone who used it, which is how a lost phone is locked out.
 */
function passwordFingerprint(scope: Scope): string | null {
  const pw = passwords().find(([, s]) => s === scope)?.[0];
  return pw && secret ? createHmac("sha256", secret).update(`staff:${scope}:${pw}`).digest("base64url").slice(0, 22) : null;
}

export const branchesFor = (scope: Scope): ("naccache" | "faqra")[] => (scope === "all" ? ["naccache", "faqra"] : [scope]);

export async function getStaffScope(request: Request): Promise<Scope | null> {
  if (!secret) return null;
  const session = await storage().getSession(request.headers.get("Cookie"));
  const scope = session.get("scope");
  const iat = session.get("iat");
  if (!scope || !iat || Date.now() - iat > SHIFT_SECONDS * 1000) return null;
  const fp = passwordFingerprint(scope);
  return fp && session.get("pw") === fp ? scope : null;
}

export async function requireStaff(request: Request): Promise<Scope> {
  const scope = await getStaffScope(request);
  if (!scope) throw redirect("/staff/login");
  return scope;
}

export async function startStaffSession(scope: Scope) {
  if (!secret) throw new Error("SESSION_SECRET is not set");
  const session = await storage().getSession();
  session.set("scope", scope);
  session.set("iat", Date.now());
  session.set("pw", passwordFingerprint(scope) ?? "");
  return redirect("/staff", { headers: { "Set-Cookie": await storage().commitSession(session) } });
}

export async function endStaffSession(request: Request) {
  const session = await storage().getSession(request.headers.get("Cookie"));
  return redirect("/staff/login", { headers: { "Set-Cookie": await storage().destroySession(session) } });
}

/**
 * The address guests should get in WhatsApp messages: the real domain, except when
 * staff are testing locally or on a Vercel preview, where links must point back there.
 */
export function publicOrigin(url: URL): string {
  const testing = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname.endsWith(".vercel.app");
  return testing ? url.origin : site.url.replace(/\/$/, "");
}

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}
