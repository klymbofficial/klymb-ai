"use client";

import { readConsent } from "@/lib/consent";

/*
 * Google Ads conversion tracking, for the ads that sell webinar seats. Like the
 * Meta Pixel it loads only for visitors who tapped OK on the cookie notice
 * (choice "all"). No email, phone or name is ever sent: only the conversion,
 * its amount and the Razorpay payment ID, so one payment is counted once.
 */

export const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID ?? "AW-18590991201";
/** The "Purchase" conversion action in Google Ads: a paid webinar seat. */
const WEBINAR_PURCHASE = `${GOOGLE_ADS_ID}/GObACMW0ur4dEOGG8KBF`;

type Gtag = (...args: unknown[]) => void;

// window.dataLayer is already declared by @next/third-parties.
declare global {
  interface Window {
    gtag?: Gtag;
  }
}

let loaded = false;

/** Google's gtag.js loader for the Ads ID. It shares dataLayer and gtag with Google Analytics. */
export function loadGoogleAds() {
  if (typeof window === "undefined" || loaded || !GOOGLE_ADS_ID) return;
  loaded = true;
  window.dataLayer = window.dataLayer || [];
  // gtag must push the arguments object itself, not an array, or gtag.js ignores it.
  window.gtag = window.gtag || function gtag() { window.dataLayer!.push(arguments); }; // eslint-disable-line prefer-rest-params
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`;
  document.head.appendChild(s);
  window.gtag("js", new Date());
  window.gtag("config", GOOGLE_ADS_ID);
}

/** Counts a paid webinar seat in Google Ads; silently does nothing without consent. */
export function adsWebinarPurchase({ paymentId, amount, currency }: { paymentId: string; amount: number; currency: string }) {
  try {
    if (typeof window === "undefined" || readConsent()?.choice !== "all") return;
    loadGoogleAds();
    window.gtag?.("event", "conversion", { send_to: WEBINAR_PURCHASE, value: amount / 100, currency, transaction_id: paymentId });
  } catch { /* tracking never breaks the page */ }
}
