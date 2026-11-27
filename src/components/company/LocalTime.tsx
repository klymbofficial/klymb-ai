"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * The same moment on the reader's own clock, when their zone differs from
 * the one it was written in. Renders nothing on the server, where the
 * reader's zone isn't known.
 */
export function LocalTime({ iso, zone }: { iso: string; zone: string }) {
  const mine = useSyncExternalStore(noop, () => Intl.DateTimeFormat().resolvedOptions().timeZone, () => null);
  if (!mine) return null;
  const same = new Intl.DateTimeFormat("en", { timeZone: mine, timeZoneName: "longOffset" }).format(new Date(iso)).slice(-9) ===
    new Intl.DateTimeFormat("en", { timeZone: zone, timeZoneName: "longOffset" }).format(new Date(iso)).slice(-9);
  if (same) return null;
  const text = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZoneName: "short" }).format(new Date(iso));
  return <span className="block text-muted">Your time: {text}</span>;
}
