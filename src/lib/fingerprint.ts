import { createHash } from "node:crypto";

/**
 * A stable, salted hash of the caller's IP.
 *
 * Throttling needs to recognise a repeat caller, not identify a person — so the
 * raw address is never stored. With a secret salt the stored value cannot be
 * reversed by hashing candidate addresses.
 */
export function callerFingerprint(
  forwardedFor: string | null,
  realIp: string | null,
  salt: string | undefined,
): string {
  // x-forwarded-for is a client-to-proxy chain; the first entry is the caller.
  const ip = (forwardedFor?.split(",")[0] ?? realIp ?? "unknown").trim() || "unknown";
  return createHash("sha256").update(`${salt ?? "klymb-unsalted"}:${ip}`).digest("hex").slice(0, 32);
}
