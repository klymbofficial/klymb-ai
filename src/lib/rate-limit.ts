import "server-only";
import { headers } from "next/headers";
import { callerFingerprint, identityFingerprint } from "@/lib/fingerprint";
import { createServiceClient } from "@/lib/supabase/admin";

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

type Client = NonNullable<ReturnType<typeof createServiceClient>>;

/** PostgREST and Postgres codes for "that function does not exist (yet)". */
const MISSING_FUNCTION = new Set(["PGRST202", "42883"]);

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
  const supabase = createServiceClient();
  if (!supabase) return { allowed: true, degraded: true };

  try {
    const salt = process.env.AUTH_SECRET;
    let fingerprint: string;
    if (identity) {
      fingerprint = identityFingerprint(identity, salt);
    } else {
      const headerList = await headers();
      fingerprint = callerFingerprint(headerList.get("x-forwarded-for"), headerList.get("x-real-ip"), salt);
    }

    const { data, error } = await supabase.rpc("rate_limit_hit", {
      p_action: action,
      p_fingerprint: fingerprint,
      p_limit: limit,
      p_window_minutes: windowMinutes,
    });
    if (!error) return { allowed: data === true };
    if (MISSING_FUNCTION.has(error.code ?? "")) return recordThenCount(supabase, action, fingerprint, limit, windowMinutes);
    return { allowed: true, degraded: true };
  } catch {
    return { allowed: true, degraded: true };
  }
}

/**
 * Used only until migration 20260924000000 is applied. Recording before
 * counting means simultaneous requests each see the others, so a burst is
 * refused rather than waved through; it can over-block a burst, never
 * under-block one.
 */
async function recordThenCount(
  supabase: Client, action: string, fingerprint: string, limit: number, windowMinutes: number,
): Promise<RateLimitResult> {
  const { error: insertError } = await supabase.from("rate_limit_events").insert({ action, fingerprint });
  if (insertError) return { allowed: true, degraded: true };

  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
  const { count, error } = await supabase
    .from("rate_limit_events")
    .select("id", { count: "exact", head: true })
    .eq("action", action)
    .eq("fingerprint", fingerprint)
    .gte("created_at", since);

  if (error) return { allowed: true, degraded: true };
  return { allowed: (count ?? 0) <= limit };
}
