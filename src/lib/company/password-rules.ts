import { randomBytes, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from "node:crypto";
import type { Limiter, LimitRule } from "@/lib/company/signin-code";
import { normaliseEmail } from "@/lib/email";

/**
 * Password sign-in for company members, kept free of Next, the database and
 * the rate limiter so every rule here can be tested. src/lib/company/password.ts
 * wires the real pieces.
 *
 *   * Nobody starts with a password. A member signs in with an emailed code,
 *     then sets one in Settings; the code stays as the way back in.
 *   * Only a salted scrypt hash is stored (Node's own crypto, no package).
 *   * Wrong tries are throttled per network and per email. A throttled
 *     password still leaves the email code, so nobody is locked out.
 *   * Changing a password asks for the current one, unless this session
 *     signed in with an email code: that is the "forgot my password" route.
 */

export const MIN_PASSWORD_LENGTH = 8;
/** scrypt's cost doesn't grow with length, but a cap keeps requests small. */
export const MAX_PASSWORD_LENGTH = 128;

/** Throttles on password tries, recorded by course.rate_limit_hit like the code limits. */
export const PASSWORD_LIMITS = {
  signInPerNetwork: { action: "company-password-verify", limit: 20, windowMinutes: 15 },
  signInPerEmail: { action: "company-password-verify-email", limit: 10, windowMinutes: 15 },
  changePerEmail: { action: "company-password-change", limit: 10, windowMinutes: 15 },
} as const satisfies Record<string, LimitRule>;

// N = 2^14, r = 8, p = 1: about 16 MB and tens of milliseconds per hash.
const N = 16384;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const SALT_BYTES = 16;

function scrypt(password: string, salt: Buffer, keyLength: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCallback(password.normalize("NFKC"), salt, keyLength, options, (error, key) => (error ? reject(error) : resolve(key))),
  );
}

/** `scrypt$N$r$p$salt$hash`, base64; the parameters travel with the hash so they can be raised later. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await scrypt(password, salt, KEY_LENGTH, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`;
}

/** True only when `password` matches `stored`. A malformed hash never matches. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [n, r, p] = parts.slice(1, 4).map(Number);
  // Refuse parameters this code would never have written, so a tampered row can't make sign-in hang.
  if (![n, r, p].every(Number.isInteger) || n < 2 || n > 2 ** 17 || r < 1 || r > 16 || p < 1 || p > 4) return false;
  const salt = Buffer.from(parts[4], "base64");
  const expected = Buffer.from(parts[5], "base64");
  if (salt.length === 0 || expected.length === 0) return false;
  try {
    const key = await scrypt(password, salt, expected.length, { N: n, r, p, maxmem: 256 * 1024 * 1024 });
    return timingSafeEqual(key, expected);
  } catch {
    return false;
  }
}

/** Why a new password can't be used, in words for the form; null when it can. */
export function passwordProblem(password: unknown, email: string): string | null {
  if (typeof password !== "string" || password.length === 0) return "Enter a new password.";
  if ([...password].length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (password.length > MAX_PASSWORD_LENGTH) return `Use at most ${MAX_PASSWORD_LENGTH} characters.`;
  if (password.trim() !== password) return "Remove the spaces at the start or end.";
  if (password.toLowerCase() === email.toLowerCase()) return "Don't use your email address as your password.";
  return null;
}

export interface PasswordStore {
  /**
   * The person's password hash while they are an active member of at least
   * one company; `hash: null` when they have none (or no active membership).
   * Null when the store failed.
   */
  find(email: string): Promise<{ hash: string | null } | null>;
  /** Sets or replaces the person's password hash. False when the store failed. */
  save(email: string, hash: string): Promise<boolean>;
}

export type PasswordSignInResult = { ok: true; email: string } | { ok: false; reason: "wrong" | "limited" };

// A hash to check against when the person has no password, so a missing
// password takes as long to refuse as a wrong one and the timing says nothing.
let decoy: Promise<string> | null = null;
const decoyHash = () => (decoy ??= hashPassword(randomBytes(16).toString("hex")));

/** Called from the "password" provider's authorize in src/auth.ts. */
export async function signInWithPassword(
  rawEmail: unknown,
  rawPassword: unknown,
  deps: { store: PasswordStore; limit: Limiter },
): Promise<PasswordSignInResult> {
  const email = normaliseEmail(rawEmail);
  if (!email || typeof rawPassword !== "string" || rawPassword.length === 0 || rawPassword.length > MAX_PASSWORD_LENGTH) {
    return { ok: false, reason: "wrong" };
  }
  if (!(await deps.limit(PASSWORD_LIMITS.signInPerNetwork))) return { ok: false, reason: "limited" };
  if (!(await deps.limit(PASSWORD_LIMITS.signInPerEmail, email))) return { ok: false, reason: "limited" };

  const found = await deps.store.find(email);
  if (!found?.hash) {
    await verifyPassword(rawPassword, await decoyHash());
    return { ok: false, reason: "wrong" };
  }
  return (await verifyPassword(rawPassword, found.hash)) ? { ok: true, email } : { ok: false, reason: "wrong" };
}

export type ChangeField = "current" | "next" | "confirm";
export type ChangeResult = { ok: true } | { ok: false; field?: ChangeField; error: string };

export const CHANGE_UNAVAILABLE = "Your password can't be saved right now. Please try again in a few minutes.";

/** True when changing the password needs the current one: it exists and this session didn't sign in with a code. */
export function needsCurrentPassword(hasPassword: boolean, signInMethod: string | undefined): boolean {
  return hasPassword && signInMethod !== "email-code";
}

/** Sets a first password, or replaces one, for the signed-in member. */
export async function changePassword(
  input: { email: string; signInMethod: string | undefined; current: unknown; next: unknown; confirm: unknown },
  deps: { store: PasswordStore; limit: Limiter },
): Promise<ChangeResult> {
  const { email } = input;
  const problem = passwordProblem(input.next, email);
  if (problem) return { ok: false, field: "next", error: problem };
  const next = input.next as string;
  if (input.confirm !== next) return { ok: false, field: "confirm", error: "The two new passwords don't match." };

  const found = await deps.store.find(email);
  if (!found) return { ok: false, error: CHANGE_UNAVAILABLE };

  if (needsCurrentPassword(found.hash !== null, input.signInMethod)) {
    if (typeof input.current !== "string" || input.current.length === 0) {
      return { ok: false, field: "current", error: "Enter your current password." };
    }
    if (!(await deps.limit(PASSWORD_LIMITS.changePerEmail, email))) {
      return { ok: false, field: "current", error: "Too many attempts. Please wait 15 minutes and try again." };
    }
    if (input.current.length > MAX_PASSWORD_LENGTH || !(await verifyPassword(input.current, found.hash as string))) {
      return { ok: false, field: "current", error: "That isn't your current password. Forgot it? Sign out and sign in with an email code, then set a new one here." };
    }
  }

  if (!(await deps.store.save(email, await hashPassword(next)))) return { ok: false, error: CHANGE_UNAVAILABLE };
  return { ok: true };
}
