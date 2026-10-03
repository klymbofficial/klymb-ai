"use client";

import { useEffect, useState } from "react";

type State = "hidden" | "ask" | "ios-install" | "busy" | "on" | "blocked" | "error";

const toKey = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

/**
 * "Turn on daily reminders" on the dashboard. One tap asks the browser for
 * permission and saves this device. iPhones can only receive web push once
 * Klymb is on the home screen, so there it explains that step instead.
 */
export function ReminderPrompt() {
  const [state, setState] = useState<State>("hidden");
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (!key || !("serviceWorker" in navigator)) return;
    let cancelled = false;
    // Everything is settled asynchronously, after the service worker is ready.
    navigator.serviceWorker.ready
      .then(async (reg): Promise<State> => {
        const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone;
        if (!("PushManager" in window) || !("Notification" in window)) return ios && !standalone ? "ios-install" : "hidden";
        if (Notification.permission === "denied") return "blocked";
        const sub = await reg.pushManager.getSubscription();
        return sub && Notification.permission === "granted" ? "on" : "ask";
      })
      .catch((): State => "ask")
      .then((next) => { if (!cancelled) setState(next); });
    return () => { cancelled = true; };
  }, [key]);

  async function enable() {
    if (!key) return;
    setState("busy");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setState(permission === "denied" ? "blocked" : "ask");
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(key) }));
      const res = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
      setState(res.ok ? "on" : "error");
    } catch {
      setState("error");
    }
  }

  async function disable() {
    setState("busy");
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push/subscribe", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
      await sub.unsubscribe().catch(() => {});
    }
    setState("ask");
  }

  if (state === "hidden") return null;
  return (
    <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-red-tint text-lg">🔔</span>
        <div>
          <p className="font-extrabold">
            {state === "on" ? "Daily reminders are on" : state === "ios-install" ? "Get daily reminders on your iPhone" : "Get a reminder each morning"}
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {state === "on"
              ? "Each day at 9 am we'll tell you what's open, and nudge you if you fall behind."
              : state === "ios-install"
                ? "Tap the Share button, then Add to Home Screen. Open Klymb from there, and this button appears."
                : state === "blocked"
                  ? "Notifications are blocked for this site. Allow them in your browser settings to get reminders."
                  : state === "error"
                    ? "That didn't work. Check your connection and try again."
                    : "A 9 am notification when your next day opens. Free, and you can turn it off any time."}
          </p>
        </div>
      </div>
      {(state === "ask" || state === "error") && (
        <button type="button" onClick={enable} className="rounded-full bg-red-strong px-5 py-2.5 text-sm font-bold text-white transition-[background-color,transform] duration-150 hover:bg-red-press active:scale-[0.97]">
          Turn on reminders
        </button>
      )}
      {state === "busy" && <span className="text-sm font-semibold text-muted">One moment…</span>}
      {state === "on" && (
        <button type="button" onClick={disable} className="text-sm font-semibold text-muted underline underline-offset-4 hover:text-ink">
          Turn off
        </button>
      )}
    </div>
  );
}
