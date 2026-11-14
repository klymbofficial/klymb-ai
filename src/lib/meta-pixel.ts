"use client";

import { readConsent } from "@/lib/consent";

/*
 * Meta Pixel, for Instagram ads shown to people who visited the course page.
 * It loads only for visitors who tapped OK on the cookie notice (choice "all");
 * "Turn analytics off", or no answer yet, means no pixel. No email, phone or
 * name is ever sent: only the event name and, for a purchase, the amount.
 */

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "2185386479036437";

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown };

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

/** Meta's loader, without the noscript image: defines fbq at once and fetches fbevents.js. */
export function loadMetaPixel() {
  if (typeof window === "undefined" || window.fbq || !META_PIXEL_ID) return;
  const n = function (...args: unknown[]) {
    if (n.callMethod) n.callMethod(...args);
    else n.queue!.push(args);
  } as Fbq;
  n.push = n;
  n.loaded = true;
  n.version = "2.0";
  n.queue = [];
  window.fbq = n;
  window._fbq = n;
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(s);
  n("init", META_PIXEL_ID);
}

/** Sends a standard event if the pixel is loaded; silently does nothing otherwise. */
export function metaTrack(event: "PageView" | "ViewContent" | "InitiateCheckout" | "Purchase", params?: Record<string, string | number>) {
  try {
    if (typeof window === "undefined" || readConsent()?.choice !== "all") return;
    loadMetaPixel();
    if (!window.fbq) return;
    if (params) window.fbq("track", event, params);
    else window.fbq("track", event);
  } catch { /* tracking never breaks the page */ }
}
