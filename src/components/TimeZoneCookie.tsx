"use client";

import { useEffect } from "react";
import { TZ_COOKIE, timeZoneOf } from "@/lib/timezone";

/**
 * Tells the server the visitor's time zone, in a first-party cookie, so a new
 * learner's day ends at their own midnight and server-drawn dates read in
 * their time. Written only when it's missing or has changed. Renders nothing.
 */
export function TimeZoneCookie() {
  useEffect(() => {
    const zone = timeZoneOf(Intl.DateTimeFormat().resolvedOptions().timeZone);
    if (!zone || document.cookie.split("; ").includes(`${TZ_COOKIE}=${encodeURIComponent(zone)}`)) return;
    document.cookie = `${TZ_COOKIE}=${encodeURIComponent(zone)}; path=/; max-age=31536000; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`;
  }, []);
  return null;
}
