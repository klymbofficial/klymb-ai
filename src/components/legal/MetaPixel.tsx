"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { readConsent } from "@/lib/consent";
import { loadMetaPixel, metaTrack } from "@/lib/meta-pixel";

/**
 * Loads the Meta Pixel only after the visitor taps OK on the cookie notice,
 * then counts a PageView on every page they open, plus ViewContent on the
 * System Design offer page. Admin pages are left out.
 */
export function MetaPixel() {
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const sync = () => setAllowed(readConsent()?.choice === "all");
    sync();
    window.addEventListener("klymb:consent", sync);
    return () => window.removeEventListener("klymb:consent", sync);
  }, []);

  useEffect(() => {
    if (!allowed || pathname.startsWith("/admin")) return;
    loadMetaPixel();
    metaTrack("PageView");
    // The System Design offer page: who to show the Instagram ad to if they leave without buying.
    if (pathname === "/system-design") metaTrack("ViewContent", { content_name: "System Design", content_type: "product" });
  }, [allowed, pathname]);

  return null;
}
