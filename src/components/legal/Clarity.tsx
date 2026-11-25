"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { readConsent } from "@/lib/consent";

/**
 * Microsoft Clarity: heatmaps, scroll depth, rage and dead clicks, and session
 * recordings. Off until NEXT_PUBLIC_CLARITY_ID is set, and then it loads only
 * for visitors who tapped OK on the cookie notice. Clarity masks what people
 * type by default; admin and the learner app are left out entirely.
 */
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID;

declare global {
  interface Window {
    clarity?: ((...args: unknown[]) => void) & { q?: unknown[] };
  }
}

const PRIVATE = ["/admin", "/learn", "/dashboard"];

export function Clarity() {
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const sync = () => setAllowed(readConsent()?.choice === "all");
    sync();
    window.addEventListener("klymb:consent", sync);
    return () => window.removeEventListener("klymb:consent", sync);
  }, []);

  useEffect(() => {
    if (!CLARITY_ID || !allowed || window.clarity || PRIVATE.some((p) => pathname.startsWith(p))) return;
    // Microsoft's loader: queues calls until the tag arrives.
    const c = function (...args: unknown[]) { (c.q = c.q || []).push(args); } as NonNullable<Window["clarity"]>;
    window.clarity = c;
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.clarity.ms/tag/${encodeURIComponent(CLARITY_ID)}`;
    document.head.appendChild(s);
  }, [allowed, pathname]);

  return null;
}
