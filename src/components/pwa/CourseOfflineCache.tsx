"use client";

import { useEffect } from "react";

const LEARN = "klymb-learn-v1";
const STATIC = "klymb-static-v1";

/**
 * On the dashboard, once per session and when the browser is idle: saves every
 * day page of this learner's course (and the scripts they need) to the
 * device, so the whole course opens offline. Skips anything that redirects,
 * so a signed-out sign-in page is never stored as a day.
 */
export function CourseOfflineCache({ days }: { days: number }) {
  useEffect(() => {
    if (!("caches" in window) || !navigator.serviceWorker?.controller || !navigator.onLine) return;
    try {
      if (sessionStorage.getItem("klymb:course-cached")) return;
    } catch { /* private mode: just run */ }

    const run = async () => {
      const learn = await caches.open(LEARN);
      const assets = new Set<string>();
      const urls = ["/learn", ...Array.from({ length: days }, (_, i) => `/learn/day/${i + 1}`)];
      for (const url of urls) {
        try {
          const res = await fetch(url, { credentials: "same-origin", redirect: "follow" });
          if (!res.ok || res.redirected) continue;
          const html = await res.clone().text();
          for (const m of html.matchAll(/["'](\/_next\/static\/[^"']+\.(?:js|css|woff2))["']/g)) assets.add(m[1]);
          await learn.put(url, res);
        } catch {
          return; // connection dropped: stop quietly, try again next session
        }
      }
      const stat = await caches.open(STATIC);
      await Promise.all([...assets].map(async (a) => ((await stat.match(a)) ? null : stat.add(a).catch(() => null))));
      try {
        sessionStorage.setItem("klymb:course-cached", "1");
      } catch { /* ignore */ }
    };
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 2000));
    idle(() => void run());
  }, [days]);
  return null;
}
