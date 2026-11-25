import "server-only";
import { CHANGE_UNAVAILABLE, changePassword, signInWithPassword, type ChangeResult, type PasswordSignInResult } from "@/lib/company/password-rules";
import { passwordStore } from "@/lib/company/password-store";
import type { Limiter } from "@/lib/company/signin-code";
import { db } from "@/lib/db/client";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Wires the password rules in src/lib/company/password-rules.ts to the real
 * database and rate limiter.
 */

const limit: Limiter = async (rule, identity) =>
  (await checkRateLimit(rule.action, { limit: rule.limit, windowMinutes: rule.windowMinutes, identity })).allowed;

/** Called from the "password" provider's authorize in src/auth.ts. */
export async function redeemPassword(rawEmail: unknown, rawPassword: unknown): Promise<PasswordSignInResult> {
  const sql = db();
  if (!sql) return { ok: false, reason: "wrong" };
  return signInWithPassword(rawEmail, rawPassword, { store: passwordStore(sql), limit });
}

/** The Settings page's change-password form. The email and sign-in method come from the session, never the form. */
export async function savePassword(input: Parameters<typeof changePassword>[0]): Promise<ChangeResult> {
  const sql = db();
  if (!sql) return { ok: false, error: CHANGE_UNAVAILABLE };
  return changePassword(input, { store: passwordStore(sql), limit });
}
