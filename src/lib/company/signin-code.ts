import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { normaliseEmail } from "@/lib/email";

/**
 * Email-code sign-in for invited company members, kept free of Next, the
 * database and the mailer so every rule here can be tested. The pieces it
 * needs are passed in: src/lib/company/signin.ts wires the real ones.
 *
 *   1. requestCode: an invited email gets a fresh 6-digit code. Anyone else
 *      gets the same answer and nothing is sent, so the form can't be used to
 *      find out who works where.
 *   2. redeemCode: the code is checked against its stored hash. Every try
 *      counts; after MAX_CODE_ATTEMPTS, or once expired, it stops working.
 *      A correct code works once.
 */

export const CODE_DIGITS = 6;
export const CODE_TTL_MINUTES = 10;
export const MAX_CODE_ATTEMPTS = 5;

export interface LimitRule {
  action: string;
  limit: number;
  windowMinutes: number;
}

/** Throttles on top of the per-code try limit, recorded by course.rate_limit_hit. */
export const LIMITS = {
  requestPerEmail: { action: "company-code-request-email", limit: 3, windowMinutes: 15 },
  requestPerNetwork: { action: "company-code-request", limit: 10, windowMinutes: 15 },
  verifyPerNetwork: { action: "company-code-verify", limit: 20, windowMinutes: 15 },
} as const satisfies Record<string, LimitRule>;

/** A uniformly random code, leading zeros kept. */
export function generateCode(): string {
  return randomInt(0, 10 ** CODE_DIGITS).toString().padStart(CODE_DIGITS, "0");
}

/** The code as typed, with spaces and dashes allowed; null unless exactly six digits. */
export function normaliseCode(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const value = input.replace(/[\s-]/g, "");
  return new RegExp(`^\\d{${CODE_DIGITS}}$`).test(value) ? value : null;
}

/**
 * HMAC-SHA256 keyed with the server secret, bound to the email. Without the
 * secret a leaked table can't be reversed, and one member's code hash is
 * useless for another.
 */
export function hashCode(email: string, code: string, secret: string): string {
  return createHmac("sha256", secret).update(`company-signin:${email}:${code}`).digest("hex");
}

/** Constant-time comparison of two hex hashes. */
export function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length > 0 && x.length === y.length && timingSafeEqual(x, y);
}

export interface CodeStore {
  /** True for an invited member, false for anyone else, null when the store failed. */
  isMember(email: string): Promise<boolean | null>;
  /** Saves a fresh code, replacing any earlier one and resetting its tries. */
  save(email: string, hash: string, expiresAt: Date): Promise<boolean>;
  /**
   * Counts one try against an unexpired code that is under the try limit, in
   * one step, and returns its hash. Null when there is no such code.
   */
  takeAttempt(email: string, maxAttempts: number, now: Date): Promise<string | null>;
  /** Deletes the code if it is still this one. True only for the call that deleted it. */
  consume(email: string, hash: string): Promise<boolean>;
}

/** True when the action is allowed. `identity` throttles an email instead of a network. */
export type Limiter = (rule: LimitRule, identity?: string) => Promise<boolean>;

export type RequestResult =
  | { status: "sent"; email: string }
  | { status: "invalid" }
  | { status: "limited" }
  | { status: "unavailable" };

export async function requestCode(
  rawEmail: unknown,
  deps: {
    store: CodeStore;
    limit: Limiter;
    send: (email: string, code: string) => Promise<void>;
    secret: string | undefined;
    now?: () => Date;
  },
): Promise<RequestResult> {
  const email = normaliseEmail(rawEmail);
  if (!email) return { status: "invalid" };
  // Throttled before the member lookup, so a limited answer says nothing about who is invited.
  if (!(await deps.limit(LIMITS.requestPerNetwork))) return { status: "limited" };
  if (!(await deps.limit(LIMITS.requestPerEmail, email))) return { status: "limited" };
  if (!deps.secret) return { status: "unavailable" };

  const member = await deps.store.isMember(email);
  if (member === null) return { status: "unavailable" };
  // Not invited: the same answer as success, and nothing is stored or sent.
  if (!member) return { status: "sent", email };

  const code = generateCode();
  const now = deps.now?.() ?? new Date();
  const expiresAt = new Date(now.getTime() + CODE_TTL_MINUTES * 60_000);
  if (!(await deps.store.save(email, hashCode(email, code, deps.secret), expiresAt))) return { status: "unavailable" };
  await deps.send(email, code);
  return { status: "sent", email };
}

export type RedeemResult = { ok: true; email: string } | { ok: false; reason: "wrong" | "limited" };

export async function redeemCode(
  rawEmail: unknown,
  rawCode: unknown,
  deps: { store: CodeStore; limit: Limiter; secret: string | undefined; now?: () => Date },
): Promise<RedeemResult> {
  const email = normaliseEmail(rawEmail);
  const code = normaliseCode(rawCode);
  // A malformed entry can't match, so it doesn't use up a try.
  if (!email || !code) return { ok: false, reason: "wrong" };
  if (!(await deps.limit(LIMITS.verifyPerNetwork))) return { ok: false, reason: "limited" };
  if (!deps.secret) return { ok: false, reason: "wrong" };

  // The try is counted before the comparison, so parallel guesses can't share one.
  const stored = await deps.store.takeAttempt(email, MAX_CODE_ATTEMPTS, deps.now?.() ?? new Date());
  if (!stored) return { ok: false, reason: "wrong" };
  if (!sameHash(stored, hashCode(email, code, deps.secret))) return { ok: false, reason: "wrong" };
  // Single use: only the request that deletes the row signs in.
  if (!(await deps.store.consume(email, stored))) return { ok: false, reason: "wrong" };
  return { ok: true, email };
}
