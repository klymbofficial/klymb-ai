"use client";

import { GoogleAnalytics } from "@next/third-parties/google";
import { useEffect, useState } from "react";
import { readConsent } from "@/lib/consent";

/**
 * Google Analytics runs by default; it stops for anyone who opts out at
 * /cookies. The Cookie Policy states this plainly — the product and the policy
 * have to say the same thing.
 */
export function Analytics({ gaId }: { gaId: string }) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    // Opt-out model: the only state that disables analytics is an explicit "necessary".
    const sync = () => setAllowed(readConsent()?.choice !== "necessary");
    sync();
    window.addEventListener("klymb:consent", sync);
    return () => window.removeEventListener("klymb:consent", sync);
  }, []);

  if (!allowed) return null;
  return <GoogleAnalytics gaId={gaId} />;
}
