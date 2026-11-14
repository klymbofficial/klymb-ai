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
  blocked: "Notifications are blocked for klymb.ai. Allow them in your browser’s site settings, then come back.",
  ios: "On iPhone and iPad, reminders only work from the Home Screen: tap Share, then Add to Home Screen, then open Klymb.ai from the new icon and sign in.",
  error: "That didn’t work. Check your connection and try again.",
};

/** iPadOS Safari calls itself a Mac, so a touch screen gives it away. */
const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);

/** Daily reminders on this device. Hidden where the browser can't do them, and until the site has its keys. */
function useReminders() {
  const [state, setState] = useState<State>("hidden");
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (!key) return;
    let live = true;
    // iOS only offers push to an app opened from the Home Screen, so Safari and in-app browsers there get the steps.
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      const next: State = isIos() ? "ios" : "hidden";
      queueMicrotask(() => { if (live) setState(next); });
      return () => { live = false; };
    }
    navigator.serviceWorker.ready
      .then(async (reg): Promise<State> => {
        if (Notification.permission === "denied") return "blocked";
        const sub = await reg.pushManager.getSubscription();
        return sub && Notification.permission === "granted" ? "on" : "off";
      })
      .catch((): State => "off")
      .then((next) => { if (live) setState(next); });
    return () => { live = false; };
  }, [key]);

  const enable = async (): Promise<State> => {
    const done = (next: State) => { setState(next); return next; };
    if (!key) return state;
    setState("busy");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return done(permission === "denied" ? "blocked" : "off");
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(key) }));
      const res = await fetch("/api/sd/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
      return done(res.ok ? "on" : "error");
    } catch {
      return done("error");
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
  return <Toggle on={state === "on"} onClick={() => { if (state === "on") disable(); else if (state !== "ios" && state !== "blocked") enable(); }} label="Daily reminder" sub={SUB[state]} />;
}

/** The invitation, on Home, only until they've answered it. */
export function ReminderPrompt() {
  const { state, enable } = useReminders();
  if (state === "hidden" || state === "on") return null;
  const canAsk = state !== "ios" && state !== "blocked";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border-2 border-sd-divider px-3 py-2.5">
      <span className="min-w-0 flex-[1_1_220px] text-[13px] leading-[1.3]"><b>Keep your streak going.</b> {SUB[state]}</span>
      {canAsk && <button type="button" onClick={enable} disabled={state === "busy"} className="sd-btn sd-btn-secondary h-10 disabled:opacity-50">Turn on reminders</button>}
    </div>
  );
}

const ASKED = "klymb.sd.reminder-asked";
const ASK_AGAIN_MS = 3 * 86_400_000;

/**
 * Asks on opening the course, and again every few days while reminders are off on this
 * device. Browsers only allow the real permission prompt from a tap, so this comes first.
 * Where it can't be turned on from here, it says what to do instead.
 */
export function ReminderSheet() {
  const { state, enable } = useReminders();
  const [asked, setAsked] = useState(() => {
    try { return Date.now() - Number(window.localStorage.getItem(ASKED) ?? 0) < ASK_AGAIN_MS; } catch { return false; }
  });
  const close = () => {
    setAsked(true);
    try { window.localStorage.setItem(ASKED, String(Date.now())); } catch { /* storage off: they may be asked again */ }
  };
  if (asked || state === "hidden" || state === "on") return null;
  const canAsk = state !== "ios" && state !== "blocked";
  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-stretch justify-end bg-sd-n-900/50 lg:items-center lg:justify-center" onKeyDown={(e) => { if (e.key === "Escape") close(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="sd-remind-t" className="sd-a-in sd-lg-shadow flex flex-col gap-3 rounded-t-2xl border-t-[3px] border-sd-accent bg-sd-bg px-5 pt-[18px] pb-[34px] lg:w-[min(480px,90%)] lg:rounded-2xl lg:p-6">
        <span className="sd-kicker text-sd-accent-700">Daily reminder</span>
        <h3 id="sd-remind-t" className="m-0 text-2xl leading-[1.15] tracking-[-0.02em] text-balance">Don’t lose your streak.</h3>
        {state === "ios" ? (
          <>
            <p className="m-0 text-[15px] leading-[1.45] text-pretty text-sd-n-800">On iPhone and iPad, Apple only sends reminders to apps on your Home Screen. It takes 20 seconds:</p>
            <ol className="m-0 flex list-decimal flex-col gap-1.5 pl-5 text-[15px] leading-[1.4] text-sd-n-800">
              <li>Tap <b>Share</b> (the square with an arrow) in your browser.</li>
              <li>Tap <b>Add to Home Screen</b>, then <b>Add</b>.</li>
              <li>Open <b>Klymb.ai</b> from the new icon, sign in, and tap <b>Turn on reminders</b>.</li>
            </ol>
          </>
        ) : (
          <p className="m-0 text-[15px] leading-[1.45] text-pretty text-sd-n-800">{SUB[state]}{canAsk && " You can turn it off any time in Profile."}</p>
        )}
        {canAsk && <button type="button" disabled={state === "busy"} onClick={() => enable().then((next) => { if (next === "on") close(); })} className="sd-btn sd-btn-primary mt-1 h-[52px] text-base disabled:opacity-50">Turn on reminders</button>}
        <button type="button" onClick={close} className="sd-btn sd-btn-ghost self-start">{canAsk ? "Not now" : "Got it"}</button>
      </div>
    </div>
  );
}
