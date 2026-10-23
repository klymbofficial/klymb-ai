import "server-only";
import { createHmac } from "node:crypto";

/**
 * Live sign-out, the way Netflix does it: each learner's open tabs listen on a
 * private Supabase Realtime channel, and a device switch broadcasts on it.
 * The channel name is an HMAC of the learner id, so nobody can guess another
 * learner's channel. The message carries nothing: listeners re-check with
 * the server, which alone decides who holds the device.
 *
 * This and src/components/learner/DeviceWatch.tsx are the only places Supabase
 * is still used, and only as a message bus. Every table moved to the Neon
 * database that runs app.klymb.ai (see src/lib/db/client.ts), so the Supabase
 * project holds no data at all — broadcast is a pub/sub service that never
 * touches a database, which is why the move cost this feature nothing.
 */
export function deviceChannel(learnerId: string) {
  const secret = process.env.AUTH_SECRET ?? "";
  return `device-${createHmac("sha256", secret).update(learnerId).digest("hex").slice(0, 32)}`;
}

export async function broadcastTakeover(learnerId: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  await fetch(`${url}/realtime/v1/api/broadcast`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ topic: deviceChannel(learnerId), event: "takeover", payload: {} }] }),
    signal: AbortSignal.timeout(3000),
  }).catch((e) => console.error("takeover broadcast failed:", e));
}
