import "server-only";
import { timingSafeEqual } from "node:crypto";

/** True when the request carries CRON_SECRET as a bearer token. Constant-time, so the secret can't be guessed byte by byte. */
export function isCronRequest(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return given.length === want.length && timingSafeEqual(given, want);
}
