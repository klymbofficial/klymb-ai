"use client";

import { readConsent } from "@/lib/consent";

/*
 * Where people drop off on the offer page, one step at a time, for the funnel
 * in admin. Sent straight away, because the next step often leaves the page.
 * Honours "Turn analytics off", and never gets in the way of a purchase.
 */

export type OfferStep = "view" | "form_start" | "claim" | "blocked" | "open_browser" | "google" | "order_failed" | "rzp_open" | "rzp_closed" | "rzp_failed" | "paid";

const ANON_KEY = "klymb.sd.anon";

function anon() {
  try {
    let id = window.localStorage.getItem(ANON_KEY);
    if (!id) { id = crypto.randomUUID(); window.localStorage.setItem(ANON_KEY, id); }
    return id;
  } catch {
    return null;
  }
}

export function trackOffer(step: OfferStep, props: { inApp: boolean; campaign: string | null }) {
  try {
    const id = anon();
    if (!id || readConsent()?.choice === "necessary") return;
    const body = JSON.stringify({
      anon: id,
      device: window.innerWidth < 768 ? "phone" : "desktop",
      events: [{ e: "offer", step, path: window.location.pathname, props: { inApp: props.inApp, ...(props.campaign ? { campaign: props.campaign } : {}) } }],
    });
    fetch("/api/sd/events", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => {});
  } catch { /* tracking never breaks the page */ }
}
