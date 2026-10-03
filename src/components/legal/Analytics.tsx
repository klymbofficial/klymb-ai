"use client";

import { GoogleAnalytics } from "@next/third-parties/google";
import { useEffect, useState } from "react";
import { readConsent } from "@/lib/consent";

/**
 * Google Analytics runs by default; it stops for anyone who opts out at
 * /cookies. The Cookie Policy states this plainly: the product and the policy
 * have to say the same thing.
 */
export function Analytics({ gaId }: { gaId: string }) {
  const [allowed, setAllowed] = useState(false);
  // Load GA only once the visitor interacts (or after a few seconds), so its
  // 175 KB of script never competes with the first paint.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const go = () => setReady(true);
    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, go, { once: true, passive: true }));
    const timer = window.setTimeout(go, 8000);
    return () => {
      window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, go));
    };
  }, []);

  useEffect(() => {
    // Opt-out model: the only state that disables analytics is an explicit "necessary".
    const sync = () => setAllowed(readConsent()?.choice !== "necessary");
    sync();
    window.addEventListener("klymb:consent", sync);
    return () => window.removeEventListener("klymb:consent", sync);
  }, []);

  if (!allowed || !ready) return null;
  return <GoogleAnalytics gaId={gaId} />;
}
