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

const ASKED = "klymb.sd.reminder-asked";

/** Asks once per device, on opening the course. Browsers only allow the real permission prompt from a tap, so this comes first. */
export function ReminderSheet() {
  const { state, enable } = useReminders();
  const [asked, setAsked] = useState(() => {
    try { return window.localStorage.getItem(ASKED) === "1"; } catch { return false; }
  });
  const close = () => {
    setAsked(true);
    try { window.localStorage.setItem(ASKED, "1"); } catch { /* storage off: they may be asked again */ }
  };
  if (asked || (state !== "off" && state !== "busy" && state !== "error")) return null;
  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-stretch justify-end bg-sd-n-900/50 lg:items-center lg:justify-center" onKeyDown={(e) => { if (e.key === "Escape") close(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="sd-remind-t" className="sd-a-in sd-lg-shadow flex flex-col gap-3 rounded-t-2xl border-t-[3px] border-sd-accent bg-sd-bg px-5 pt-[18px] pb-[34px] lg:w-[min(480px,90%)] lg:rounded-2xl lg:p-6">
        <span className="sd-kicker text-sd-accent-700">Daily reminder</span>
        <h3 id="sd-remind-t" className="m-0 text-2xl leading-[1.15] tracking-[-0.02em] text-balance">Don’t lose your streak.</h3>
        <p className="m-0 text-[15px] leading-[1.45] text-pretty text-sd-n-800">{SUB[state]} You can turn it off any time in Profile.</p>
        <button type="button" disabled={state === "busy"} onClick={() => enable().then(close)} className="sd-btn sd-btn-primary mt-1 h-[52px] text-base disabled:opacity-50">Turn on reminders</button>
        <button type="button" onClick={close} className="sd-btn sd-btn-ghost self-start">Not now</button>
      </div>
    </div>
  );
}
