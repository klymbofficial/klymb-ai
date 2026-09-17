"use client";

import { GoogleAnalytics } from "@next/third-parties/google";
import { useEffect, useState } from "react";
import { readConsent } from "@/lib/consent";

/**
 * Google Analytics loads only after analytics consent.
 *
 * Before then no request is made to Google at all — which is what the Cookie
 * Policy promises, so it has to be literally true.
 */
export function Analytics({ gaId }: { gaId: string }) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const sync = () => setAllowed(readConsent()?.choice === "all");
    sync();
    window.addEventListener("klymb:consent", sync);
    return () => window.removeEventListener("klymb:consent", sync);
  }, []);

  if (!allowed) return null;
  return <GoogleAnalytics gaId={gaId} />;
}
