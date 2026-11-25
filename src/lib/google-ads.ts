"use client";

import { readConsent } from "@/lib/consent";

/*
 * Google Ads conversion tracking, for the ads that sell the $1 webinar seat.
 * Like the Meta Pixel it loads only for visitors who tapped OK on the cookie
 * notice. It runs on every page so Google can tie a later purchase to the ad
 * click that brought them; the only conversion it reports is a paid webinar
 * seat, with its amount and order ID. No name, email or phone is ever sent.
 */

export const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID ?? "AW-18590991201";
/** The "Purchase" conversion action in Google Ads. */
const PURCHASE_SEND_TO = process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE ?? `${GOOGLE_ADS_ID}/GObACMW0ur4dEOGG8KBF`;

// window.dataLayer is declared by @next/third-parties; gtag is added here.
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const allowed = () => typeof window !== "undefined" && readConsent()?.choice === "all" && !!GOOGLE_ADS_ID;

/** Loads gtag.js for the Ads account once. Shares Google Analytics' gtag and dataLayer when it's already on the page. */
export function loadGoogleAds() {
  if (!allowed() || document.getElementById("google-ads-gtag")) return;
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtag() {
      // gtag.js reads the arguments object itself, so it's pushed as is.
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
    window.gtag("js", new Date());
  }
  const s = document.createElement("script");
  s.id = "google-ads-gtag";
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GOOGLE_ADS_ID)}`;
  document.head.appendChild(s);
  window.gtag("config", GOOGLE_ADS_ID);
}

/** Reports a paid webinar seat. The order ID keeps a retried confirmation from counting twice. */
export function adsPurchase(p: { transactionId: string; value: number; currency: string }) {
  try {
    if (!allowed()) return;
    loadGoogleAds();
    window.gtag?.("event", "conversion", { send_to: PURCHASE_SEND_TO, value: p.value, currency: p.currency, transaction_id: p.transactionId });
  } catch { /* tracking never breaks the page */ }
}
