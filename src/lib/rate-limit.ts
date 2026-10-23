import "server-only";
import { headers } from "next/headers";
import { type Db, db } from "@/lib/db/client";
import { callerFingerprint, identityFingerprint } from "@/lib/fingerprint";

/**
 * Database-backed throttle.
 *
 * No third-party service and no secret in the browser: attempts are recorded
 * against a salted hash of the caller's IP (or of their account, when they are
 * signed in), so the raw address is never stored and the table cannot be used
 * to look someone up.
 */

export interface RateLimitResult {
  allowed: boolean;
  /** Present when the limiter could not run: callers decide whether to fail open. */
  degraded?: boolean;
}

/** Postgres undefined_function: the migration has not been applied here yet. */
const MISSING_FUNCTION = "42883";

/**
 * Allows `limit` actions per `windowMinutes` for one caller.
 *
 * The count and the record happen atomically in `rate_limit_hit`, so a burst
 * of simultaneous requests cannot all see "none so far" and all pass. Pass
 * `identity` to throttle a signed-in account instead of a network address.
 *
 * Fails open if the limiter itself is unavailable: a broken limiter must not
 * take registration down, and the honeypot plus validation still apply.
 */
export async function checkRateLimit(
  action: string,
  { limit, windowMinutes, identity }: { limit: number; windowMinutes: number; identity?: string },
): Promise<RateLimitResult> {
  const sql = db();
  if (!sql) return { allowed: true, degraded: true };

  try {
    const salt = process.env.AUTH_SECRET;
    let fingerprint: string;
    if (identity) {
      fingerprint = identityFingerprint(identity, salt);
    } else {
      const headerList = await headers();
      fingerprint = callerFingerprint(headerList.get("x-forwarded-for"), headerList.get("x-real-ip"), salt);
    }

    const { data, error } = await sql.scalar<boolean>`
      select course.rate_limit_hit(${action}, ${fingerprint}, ${limit}, ${windowMinutes})
    `;
    if (!error) return { allowed: data === true };
    if (error.code === MISSING_FUNCTION) return recordThenCount(sql, action, fingerprint, limit, windowMinutes);
    return { allowed: true, degraded: true };
  } catch {
    return { allowed: true, degraded: true };
  }
}

/**
 * Used only where course.rate_limit_hit is not in place yet. Recording before
 * counting means simultaneous requests each see the others, so a burst is
 * refused rather than waved through; it can over-block a burst, never
 * under-block one.
 */
async function recordThenCount(
  sql: Db, action: string, fingerprint: string, limit: number, windowMinutes: number,
): Promise<RateLimitResult> {
  const { error: insertError } = await sql.run`
    insert into course.rate_limit_events (action, fingerprint) values (${action}, ${fingerprint})
  `;
  if (insertError) return { allowed: true, degraded: true };

  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
  const { data: count, error } = await sql.scalar<number>`
    select count(*)::int from course.rate_limit_events
     where action = ${action} and fingerprint = ${fingerprint} and created_at >= ${since}
  `;

  if (error) return { allowed: true, degraded: true };
  return { allowed: (count ?? 0) <= limit };
}
