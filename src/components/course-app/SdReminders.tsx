"use client";

import { useEffect, useState } from "react";
import { Toggle } from "./ui";

type State = "hidden" | "off" | "on" | "busy" | "blocked" | "ios" | "error";

const toKey = (b64: string) => {
  const raw = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

const SUB: Record<Exclude<State, "hidden">, string> = {
  off: "Nudges at 8 AM, 5 PM and 9 PM, until you’ve done that day’s lesson.",
  on: "Nudges at 8 AM, 5 PM and 9 PM, until you’ve done that day’s lesson.",
  busy: "One moment…",
  blocked: "Blocked. Allow notifications for klymb.ai in your browser settings.",
  ios: "On iPhone: tap Share, then Add to Home Screen, and open Klymb from there.",
  error: "That didn’t work. Check your connection and try again.",
};

/** Daily reminders on this device. Hidden where the browser can't do them, and until the site has its keys. */
function useReminders() {
  const [state, setState] = useState<State>("hidden");
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (!key || !("serviceWorker" in navigator)) return;
    let live = true;
    navigator.serviceWorker.ready
      .then(async (reg): Promise<State> => {
        const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (!("PushManager" in window) || !("Notification" in window)) return ios ? "ios" : "hidden";
        if (Notification.permission === "denied") return "blocked";
        const sub = await reg.pushManager.getSubscription();
        return sub && Notification.permission === "granted" ? "on" : "off";
      })
      .catch((): State => "off")
      .then((next) => { if (live) setState(next); });
    return () => { live = false; };
  }, [key]);

  const enable = async () => {
    if (!key) return;
    setState("busy");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setState(permission === "denied" ? "blocked" : "off");
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(key) }));
      const res = await fetch("/api/sd/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
      setState(res.ok ? "on" : "error");
    } catch {
      setState("error");
    }
  };

  const disable = async () => {
    setState("busy");
    try {
      const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
      if (sub) {
        await fetch("/api/sd/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
        await sub.unsubscribe().catch(() => {});
      }
      setState("off");
    } catch {
      setState("error");
    }
  };

  return { state, enable, disable };
}

/** The setting, on Profile. */
export function ReminderToggle() {
  const { state, enable, disable } = useReminders();
  if (state === "hidden") return null;
  return <Toggle on={state === "on"} onClick={() => (state === "on" ? disable() : enable())} label="Daily reminder" sub={SUB[state]} />;
}

/** The invitation, on Home, only until they've answered it. */
export function ReminderPrompt() {
  const { state, enable } = useReminders();
  if (state !== "off" && state !== "busy" && state !== "error") return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border-2 border-sd-divider px-3 py-2.5">
      <span className="min-w-0 flex-[1_1_220px] text-[13px] leading-[1.3]"><b>Keep your streak going.</b> {SUB[state]}</span>
      <button type="button" onClick={enable} disabled={state === "busy"} className="sd-btn sd-btn-secondary h-10 disabled:opacity-50">Turn on reminders</button>
    </div>
  );
}
