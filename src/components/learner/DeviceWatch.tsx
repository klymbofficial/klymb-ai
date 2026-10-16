"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const EVERY_MS = 10_000;

/**
 * Signs this device out of view as soon as the learner continues on another
 * one: checks every 10 seconds while the tab is visible, and straight away
 * when the tab comes back into focus. Offline or a failed check does nothing,
 * so a patchy connection never kicks anyone out.
 */
export function DeviceWatch() {
  const pathname = usePathname() ?? "";
  const active = pathname.startsWith("/learn") && !pathname.startsWith("/learn/login");

  useEffect(() => {
    if (!active) return;
    let stopped = false;
    const check = async () => {
      if (stopped || document.visibilityState !== "visible" || !navigator.onLine) return;
      const res = await fetch("/api/device", { cache: "no-store" }).catch(() => null);
      const data = res?.ok ? await res.json().catch(() => null) : null;
      if (data?.state === "other-device") window.location.replace("/learn/login");
    };
    const timer = window.setInterval(check, EVERY_MS);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, [active]);

  return null;
}
