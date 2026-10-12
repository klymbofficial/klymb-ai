"use client";

import clsx from "clsx";
import { useEffect, useRef, useState } from "react";

type State = "hidden" | "ask" | "ios-install" | "busy" | "on" | "blocked" | "error";

const toKey = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

const COPY: Record<Exclude<State, "hidden" | "busy">, { title: string; body: string }> = {
  on: { title: "Daily reminders are on", body: "We nudge you at 9 am, 2 pm and 8 pm, only until that day is submitted." },
  ask: { title: "Turn on daily reminders", body: "A nudge when your next day opens, and only until it's done. Free, and you can turn it off any time." },
  "ios-install": { title: "Reminders on iPhone", body: "Tap Share, then Add to Home Screen. Open Klymb from there to turn reminders on." },
  blocked: { title: "Notifications are blocked", body: "Allow notifications for klymb.ai in your browser settings to get reminders." },
  error: { title: "That didn't work", body: "Check your connection and try again." },
};

/**
 * Daily reminders, from a bell in the top bar instead of a card on the page:
 * a one-time setting shouldn't take space every day. A red dot invites people
 * who haven't turned reminders on. One tap asks the browser for permission and
 * saves this device; iPhones need Klymb on the home screen first.
 */
export function ReminderBell() {
  const [state, setState] = useState<State>("hidden");
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (!key || !("serviceWorker" in navigator)) return;
    let cancelled = false;
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

  // Close on an outside tap or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

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
  const copy = state === "busy" ? null : COPY[state];
  const nudge = state === "ask" || state === "ios-install";

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={state === "on" ? "Reminders on" : "Reminders off: turn on"}
        className="relative grid size-9 place-items-center rounded-full text-ink transition-[background-color,transform] duration-150 hover:bg-surface active:scale-[0.94]"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          {state === "blocked" && <path d="m3 3 18 18" />}
        </svg>
        {nudge && <span aria-hidden="true" className="absolute top-1.5 right-1.5 size-2 rounded-full bg-red-strong ring-2 ring-card" />}
        {state === "on" && <span aria-hidden="true" className="absolute top-1.5 right-1.5 size-2 rounded-full bg-[#16a34a] ring-2 ring-card" />}
      </button>

      <div
        role="dialog"
        aria-label="Daily reminders"
        className={clsx(
          "absolute top-full right-0 z-50 mt-2 w-[min(19rem,calc(100vw-2rem))] origin-top-right rounded-card bg-card p-4 shadow-[0_12px_40px_rgba(0,0,0,0.18)] ring-1 ring-line/40",
          "transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
          open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0",
        )}
      >
        {state === "busy" || !copy ? (
          <p className="text-sm font-semibold text-muted">One moment…</p>
        ) : (
          <>
            <p className="font-extrabold">{copy.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{copy.body}</p>
            {(state === "ask" || state === "error") && (
              <button type="button" onClick={enable} className="mt-3 w-full rounded-full bg-red-strong px-4 py-2.5 text-sm font-bold text-white transition-[background-color,transform] duration-150 hover:bg-red-press active:scale-[0.97]">
                Turn on reminders
              </button>
            )}
            {state === "on" && (
              <button type="button" onClick={disable} className="mt-3 text-sm font-semibold text-muted underline underline-offset-4 hover:text-ink">
                Turn off
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
