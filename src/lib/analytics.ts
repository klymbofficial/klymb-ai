"use client";

import { sendGAEvent } from "@next/third-parties/google";

/**
 * Fire-and-forget analytics.
 *
 * No-ops when analytics is not configured, so nothing breaks locally or for
 * visitors who block the script. Never pass personal data — no emails, names,
 * phone numbers or URLs that contain them.
 */
export function track(event: string, params: Record<string, string | number | boolean> = {}) {
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_GA_ID) return;
  try {
    sendGAEvent("event", event, params);
  } catch {
    // Analytics must never break a submission.
  }
}
