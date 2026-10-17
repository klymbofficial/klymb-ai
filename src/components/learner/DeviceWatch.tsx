"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const BACKUP_EVERY_MS = 60_000;

/**
 * Signs this device out of view the moment the learner continues on another
 * one. A live Supabase Realtime channel delivers the switch in under a second;
 * a check every 60 seconds and on tab focus is the backup if the live
 * connection drops. Offline or a failed check does nothing, so a patchy
 * connection never kicks anyone out.
 */
export function DeviceWatch() {
  const pathname = usePathname() ?? "";
  const active = pathname.startsWith("/learn") && !pathname.startsWith("/learn/login");

  useEffect(() => {
    if (!active) return;
    let stopped = false;
    let disconnect: (() => void) | undefined;

    const check = async () => {
      if (stopped || !navigator.onLine) return null;
      const res = await fetch("/api/device", { cache: "no-store" }).catch(() => null);
      const data = (res?.ok ? await res.json().catch(() => null) : null) as { state?: string; channel?: string } | null;
      if (data?.state === "other-device") window.location.replace("/learn/login");
      return data;
    };

    // Live channel: loaded after the page, only on learner pages.
    (async () => {
      const data = await check();
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (stopped || !data?.channel || !url || !key) return;
      const { RealtimeClient } = await import("@supabase/realtime-js");
      if (stopped) return;
      const client = new RealtimeClient(`${url.replace(/^http/, "ws")}/realtime/v1`, { params: { apikey: key } });
      const channel = client.channel(data.channel).on("broadcast", { event: "takeover" }, () => void check()).subscribe();
      disconnect = () => { void channel.unsubscribe(); client.disconnect(); };
    })();

    const onVisible = () => { if (document.visibilityState === "visible") void check(); };
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void check(); }, BACKUP_EVERY_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      stopped = true;
      disconnect?.();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [active]);

  return null;
}
