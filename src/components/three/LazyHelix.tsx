"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const ClimbHelix = dynamic(() => import("./ClimbHelix").then((m) => m.ClimbHelix), { ssr: false });
const PrismScene = dynamic(() => import("./PrismScene").then((m) => m.PrismScene), { ssr: false });

/**
 * Mounts a 3D scene (the staircase or the prism) only where it belongs: a large screen with a mouse,
 * WebGL available, motion allowed. And only after the page has painted and the
 * visitor has moved or scrolled (or 4s have passed), so Three.js never
 * competes with the first load. Phones never download it.
 */
export function LazyHelix({ className, scene = "helix" }: { className?: string; scene?: "helix" | "prism" }) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const ok =
      window.matchMedia("(min-width: 1024px) and (pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
      !!document.createElement("canvas").getContext("webgl2");
    if (!ok) return;
    const go = () => setOn(true);
    const events = ["pointermove", "scroll", "keydown"] as const;
    events.forEach((e) => window.addEventListener(e, go, { once: true, passive: true }));
    const timer = window.setTimeout(go, 4000);
    return () => {
      window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, go));
    };
  }, []);

  if (!on) return null;
  return scene === "prism" ? <PrismScene className={className} /> : <ClimbHelix className={className} />;
}
