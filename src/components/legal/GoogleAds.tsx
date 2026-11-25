"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { readConsent } from "@/lib/consent";
import { loadGoogleAds } from "@/lib/google-ads";

/**
 * Loads the Google Ads tag on every page, but only after the visitor taps OK
 * on the cookie notice. Admin pages are left out. The conversion itself is
 * sent when a webinar seat is paid (src/lib/webinar-checkout.ts).
 */
export function GoogleAds() {
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const sync = () => setAllowed(readConsent()?.choice === "all");
    sync();
    window.addEventListener("klymb:consent", sync);
    return () => window.removeEventListener("klymb:consent", sync);
  }, []);

  useEffect(() => {
    if (allowed && !pathname.startsWith("/admin")) loadGoogleAds();
  }, [allowed, pathname]);

  return null;
}
