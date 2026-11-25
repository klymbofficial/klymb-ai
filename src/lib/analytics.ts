"use client";

import { sendGAEvent } from "@next/third-parties/google";
import { track as vercelTrack } from "@vercel/analytics";
import { readConsent } from "@/lib/consent";

/**
 * Fire-and-forget analytics.
 *
 * No-ops when analytics is not configured, so nothing breaks locally or for
 * visitors who block the script. Never pass personal data: no emails, names,
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

type Props = Record<string, string | number>;

// GA loads lazily, on the first tap or scroll, so the very first click can
// arrive before it. Those events wait here and go once GA is up.
const waiting: [string, Props][] = [];
let flushing = false;

function toGa(event: string, params: Props) {
  if (!process.env.NEXT_PUBLIC_GA_ID) return;
  // Someone who switched analytics off never loads GA; their events are dropped, not queued forever.
  if (readConsent()?.choice === "necessary") return;
  if (window.gtag) return sendGAEvent("event", event, params);
  waiting.push([event, params]);
  if (flushing) return;
  flushing = true;
  let tries = 0;
  const timer = window.setInterval(() => {
    tries += 1;
    if (window.gtag) {
      for (const [e, p] of waiting.splice(0)) sendGAEvent("event", e, p);
    }
    if (window.gtag || tries > 40) {
      window.clearInterval(timer);
      waiting.length = 0;
      flushing = false;
    }
  }, 500);
}

/**
 * A marketing event that goes to both GA4 (every parameter) and Vercel Web
 * Analytics (its name plus up to two short properties, so it stays readable in
 * Vercel's dashboard). Used for clicks and the webinar funnel only: the
 * high-volume learner events stay GA-only through track().
 */
export function trackEvent(event: string, params: Props = {}, vercel: Props = {}) {
  if (typeof window === "undefined") return;
  try {
    toGa(event, params);
  } catch { /* never breaks the page */ }
  try {
    vercelTrack(event, Object.fromEntries(Object.entries(vercel).slice(0, 2)));
  } catch { /* never breaks the page */ }
}
