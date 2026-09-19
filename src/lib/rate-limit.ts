import "server-only";
import { headers } from "next/headers";
import { callerFingerprint } from "@/lib/fingerprint";
import { createServiceClient } from "@/lib/supabase/admin";

/**
 * Database-backed throttle.
 *
 * No third-party service and no secret in the browser: attempts are recorded
 * against a salted hash of the caller's IP, so the raw address is never stored
 * and the table cannot be used to look someone up.
 */

export interface RateLimitResult {
  allowed: boolean;
  /** Present when the limiter could not run — callers decide whether to fail open. */
  degraded?: boolean;
}

/**
 * Allows `limit` actions per `windowMinutes` for one caller.
 * Fails open if the limiter itself is unavailable: a broken limiter must not
 * take registration down, and the honeypot plus validation still apply.
 */
export async function checkRateLimit(
  action: string,
  { limit, windowMinutes }: { limit: number; windowMinutes: number },
): Promise<RateLimitResult> {
  const supabase = createServiceClient();
  if (!supabase) return { allowed: true, degraded: true };

  try {
    const headerList = await headers();
    const fingerprint = callerFingerprint(headerList.get("x-forwarded-for"), headerList.get("x-real-ip"), process.env.AUTH_SECRET);
    const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();

    const { count, error } = await supabase
      .from("rate_limit_events")
      .select("id", { count: "exact", head: true })
      .eq("action", action)
      .eq("fingerprint", fingerprint)
      .gte("created_at", since);

    if (error) return { allowed: true, degraded: true };
    if ((count ?? 0) >= limit) return { allowed: false };

    await supabase.from("rate_limit_events").insert({ action, fingerprint });
    return { allowed: true };
  } catch {
    return { allowed: true, degraded: true };
  }
}
