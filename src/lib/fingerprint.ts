import { createHash } from "node:crypto";

/**
 * A stable, salted hash of the caller's IP.
 *
 * Throttling needs to recognise a repeat caller, not identify a person: so the
 * raw address is never stored. With a secret salt the stored value cannot be
 * reversed by hashing candidate addresses.
 */
export function callerFingerprint(
  forwardedFor: string | null,
  realIp: string | null,
  salt: string | undefined,
): string {
  // x-real-ip is set by the platform itself and cannot be supplied by the
  // caller, so it wins. x-forwarded-for is a client-to-proxy chain whose first
  // entry is the caller; it is the fallback where no x-real-ip exists.
  const ip = (realIp?.trim() || forwardedFor?.split(",")[0]?.trim() || "unknown");
  return hashKey(`ip:${ip}`, salt);
}

/**
 * The same salted hash for a signed-in identity, so an authenticated action
 * can be throttled per account rather than per network.
 */
export function identityFingerprint(identity: string, salt: string | undefined): string {
  return hashKey(`id:${identity}`, salt);
}

function hashKey(value: string, salt: string | undefined): string {
  return createHash("sha256").update(`${salt ?? "klymb-unsalted"}:${value}`).digest("hex").slice(0, 32);
}
