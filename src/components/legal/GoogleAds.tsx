"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { readConsent } from "@/lib/consent";
import { loadGoogleAds } from "@/lib/google-ads";

/** Loads the Google Ads tag only after the visitor taps OK on the cookie notice. Admin pages are left out. */
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
