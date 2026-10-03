import "server-only";
import webpush from "web-push";

/** Web Push via VAPID. Needs NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY; without them nothing sends. */
export function pushReady() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails("mailto:team@klymb.ai", pub, priv);
  return true;
}

export interface PushTarget { endpoint: string; p256dh: string; auth: string }
export interface PushMessage { title: string; body: string; url: string; tag?: string }

/** Sends one notification. Returns "gone" when the device has unsubscribed, so the row can be deleted. */
export async function sendPush(t: PushTarget, msg: PushMessage): Promise<"ok" | "gone" | "failed"> {
  try {
    await webpush.sendNotification({ endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } }, JSON.stringify(msg), { TTL: 60 * 60 * 12, urgency: "normal" });
    return "ok";
  } catch (e) {
    const code = (e as { statusCode?: number }).statusCode;
    return code === 404 || code === 410 ? "gone" : "failed";
  }
}
