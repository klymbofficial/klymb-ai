import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * The security around connecting LinkedIn: the state that ties LinkedIn's
 * callback to the learner who started it, and the sealing of the token kept
 * afterwards. Both are keyed from AUTH_SECRET, each with its own derived key.
 *
 * Pure (no server-only, no request objects), so the tests exercise exactly
 * what the routes run.
 */

/** The cookie holding the state while the learner is on LinkedIn's consent screen. */
export const STATE_COOKIE = "klymb_li_state";
/** Only the LinkedIn routes ever need to see it. */
export const STATE_COOKIE_PATH = "/api/linkedin";
/** Long enough to sign in to LinkedIn on the way; the code LinkedIn returns lasts 30 minutes. */
export const STATE_TTL_SECONDS = 10 * 60;

export interface LinkedInApp { clientId: string; clientSecret: string; secret: string; version?: string }

/** The developer app's credentials, or null when one-tap posting isn't set up here. */
export function linkedInApp(env: Record<string, string | undefined> = process.env): LinkedInApp | null {
  const clientId = env.LINKEDIN_CLIENT_ID?.trim();
  const clientSecret = env.LINKEDIN_CLIENT_SECRET?.trim();
  const secret = env.AUTH_SECRET;
  if (!clientId || !clientSecret || !secret) return null;
  return { clientId, clientSecret, secret, version: env.LINKEDIN_API_VERSION?.trim() || undefined };
}

/**
 * The callback LinkedIn redirects to. It must match a redirect URL on the
 * developer app exactly, so it comes from AUTH_URL, the canonical origin,
 * where that is set, the same rule Auth.js follows for Google's callback.
 */
export function redirectUri(requestUrl: string, env: Record<string, string | undefined> = process.env) {
  return `${new URL(env.AUTH_URL || requestUrl).origin}/api/linkedin/callback`;
}

/**
 * Where to send the learner afterwards: a path on this site, never another
 * origin, whatever arrives in the query string.
 */
export function safeReturnTo(raw: unknown): string {
  if (typeof raw !== "string" || raw.length > 512 || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  // Control characters are how "/\t/evil.com" turns into another host.
  if (/[\u0000-\u001f\u007f]/.test(raw)) return "/";
  try {
    const base = "https://return.invalid";
    const url = new URL(raw, base);
    return url.origin === base ? `${url.pathname}${url.search}${url.hash}` : "/";
  } catch {
    return "/";
  }
}

const b64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64url");
const key = (secret: string, purpose: "state" | "token") =>
  Buffer.from(hkdfSync("sha256", secret, "klymb.ai linkedin", purpose, 32));
const mac = (secret: string, data: string) => createHmac("sha256", key(secret, "state")).update(data).digest();

function same(a: Buffer, b: Buffer) {
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Which account started the flow, without putting the address itself in a cookie. */
const accountTag = (email: string, secret: string) => b64(mac(secret, `account:${email}`).subarray(0, 16));

interface StatePayload { s: string; a: string; r: string; x: number }

/**
 * A fresh state for LinkedIn's authorize URL, and the signed cookie that
 * remembers it: the state, which account it is for, where to come back to,
 * and when it stops being accepted.
 */
export function startOAuth(email: string, returnTo: string, secret: string, now = Date.now()) {
  const state = b64(randomBytes(32));
  const payload: StatePayload = { s: state, a: accountTag(email, secret), r: safeReturnTo(returnTo), x: now + STATE_TTL_SECONDS * 1000 };
  const body = b64(Buffer.from(JSON.stringify(payload)));
  return { state, cookie: `${body}.${b64(mac(secret, body))}` };
}

export type StateCheck =
  | { ok: true; returnTo: string }
  /** `returnTo` is the cookie's own only when the cookie is genuine; otherwise the home page. */
  | { ok: false; reason: "missing" | "forged" | "expired" | "mismatch" | "other-account"; returnTo: string };

/**
 * The CSRF check on LinkedIn's callback. It passes only when the state
 * LinkedIn sent back is the one in this browser's cookie, the cookie is ours
 * and unexpired, and the learner signed in now is the one who started.
 * Without it, someone could finish their own LinkedIn consent in a learner's
 * browser and have the learner's posts land on their feed.
 */
export function checkOAuthState(
  cookie: string | undefined, state: string | null, email: string | null, secret: string, now = Date.now(),
): StateCheck {
  const home = "/";
  if (!cookie || !state) return { ok: false, reason: "missing", returnTo: home };
  const [body, signature, extra] = cookie.split(".");
  if (!body || !signature || extra !== undefined || !same(Buffer.from(signature, "base64url"), mac(secret, body))) {
    return { ok: false, reason: "forged", returnTo: home };
  }
  let payload: StatePayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as StatePayload;
  } catch {
    return { ok: false, reason: "forged", returnTo: home };
  }
  const returnTo = safeReturnTo(payload.r);
  if (typeof payload.x !== "number" || now > payload.x) return { ok: false, reason: "expired", returnTo };
  if (typeof payload.s !== "string" || !same(Buffer.from(state), Buffer.from(payload.s))) return { ok: false, reason: "mismatch", returnTo: home };
  if (!email || typeof payload.a !== "string" || !same(Buffer.from(payload.a), Buffer.from(accountTag(email, secret)))) {
    return { ok: false, reason: "other-account", returnTo };
  }
  return { ok: true, returnTo };
}

/**
 * Seals a value for the database: AES-256-GCM under a key derived from
 * AUTH_SECRET, with the learner's email as additional data, so a sealed
 * value copied onto another learner's row does not open.
 */
export function seal(value: string, secret: string, email: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret, "token"), iv);
  cipher.setAAD(Buffer.from(email, "utf8"));
  const sealed = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return ["v1", b64(iv), b64(sealed), b64(cipher.getAuthTag())].join(".");
}

/** The sealed value, or null if it was tampered with, is another learner's, or AUTH_SECRET changed. */
export function unseal(sealed: string, secret: string, email: string): string | null {
  const [version, iv, data, tag] = sealed.split(".");
  if (version !== "v1" || !iv || !data || !tag) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key(secret, "token"), Buffer.from(iv, "base64url"));
    decipher.setAAD(Buffer.from(email, "utf8"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/**
 * A write from a page of this site. The session cookie is SameSite=Lax, which
 * already keeps other sites' forms out; this is the second lock on the door
 * for a request that posts to someone's LinkedIn.
 */
export function sameOrigin(requestUrl: string, origin: string | null, fetchSite: string | null) {
  // Set by the browser itself, so a page cannot fake it; older browsers send only Origin.
  if (fetchSite) return fetchSite === "same-origin";
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(requestUrl).origin;
  } catch {
    return false;
  }
}
