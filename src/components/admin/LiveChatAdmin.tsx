"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { removeChatDevice, saveChatDevice, sendTeamReply, setChatStatus } from "@/app/admin/chat-actions";

/** Re-reads the page from the server every few seconds while it's on screen, so new messages appear. */
export function AutoRefresh({ ms }: { ms: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = window.setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, ms);
    const onShow = () => { if (document.visibilityState === "visible") router.refresh(); };
    document.addEventListener("visibilitychange", onShow);
    return () => { window.clearInterval(t); document.removeEventListener("visibilitychange", onShow); };
  }, [ms, router]);
  return null;
}

/** Keeps the newest message in view as the conversation grows. */
export function ScrollToEnd({ count }: { count: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollIntoView({ block: "end" }); }, [count]);
  return <div ref={ref} />;
}

const QUICK = [
  "Hi! Thanks for reaching out. ",
  "You can join the System Design course here: https://www.klymb.ai/system-design",
  "Your seat is confirmed. Open the course here: https://www.klymb.ai/learn/system-design",
  "Could you share a screenshot of what you're seeing? That helps us fix it faster.",
];

export function ReplyBox({ threadId, status }: { threadId: string; status: "open" | "done" }) {
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  const send = () => {
    const body = text.trim();
    if (!body) return;
    start(async () => {
      const r = await sendTeamReply(threadId, body);
      if (!r.ok) { setNote(r.message); return; }
      setText("");
      setNote(r.emailed ? "Sent, and emailed too: they weren't on the site." : "");
      router.refresh();
    });
  };

  return (
    <div className="sticky bottom-0 border-t border-line/30 bg-card p-3">
      <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
        {QUICK.map((q) => (
          <button key={q} type="button" onClick={() => setText((t) => (t ? `${t}${t.endsWith(" ") ? "" : " "}${q}` : q))} className="shrink-0 rounded-full border border-line/40 px-2.5 py-1 text-[11px] font-semibold hover:bg-surface">
            {q.length > 34 ? `${q.slice(0, 33)}…` : q}
          </button>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-end gap-2">
        <label htmlFor="chat-reply" className="sr-only">Reply as the Klymb team</label>
        <textarea
          id="chat-reply"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && window.innerWidth >= 768) { e.preventDefault(); send(); } }}
          rows={2}
          maxLength={2000}
          placeholder="Reply as the Klymb team…"
          className="min-h-11 flex-1 resize-none border border-line/50 bg-white px-3 py-2 text-sm focus:border-ink focus:outline-none"
        />
        <button type="submit" disabled={pending || !text.trim()} className="h-11 bg-ink px-4 text-xs font-bold uppercase tracking-wider text-paper disabled:opacity-40">
          {pending ? "Sending" : "Send"}
        </button>
      </form>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        <span className="text-muted" role="status">{note || "They see this as “Klymb team”."}</span>
        <button
          type="button"
          disabled={pending}
          onClick={() => start(async () => { await setChatStatus(threadId, status === "open" ? "done" : "open"); router.refresh(); })}
          className="border border-line/50 px-2.5 py-1 font-bold hover:bg-surface"
        >
          {status === "open" ? "Mark done" : "Reopen"}
        </button>
      </div>
    </div>
  );
}

const toKey = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

type PushState = "checking" | "off" | "on" | "busy" | "blocked" | "unsupported" | "ios-install" | "error";

/** Turns chat notifications on for this phone or laptop. */
export function ChatPushToggle() {
  const [state, setState] = useState<PushState>("checking");
  const [error, setError] = useState("");
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    const done = (s: PushState) => window.setTimeout(() => setState(s), 0);
    if (!key || !("serviceWorker" in navigator) || !("PushManager" in window)) return void done(ios && !standalone ? "ios-install" : "unsupported");
    if (Notification.permission === "denied") return void done("blocked");
    navigator.serviceWorker.getRegistration().then((reg) => reg?.pushManager.getSubscription()).then((sub) => done(sub ? "on" : "off")).catch(() => done("off"));
  }, [key]);

  async function enable() {
    if (!key) return;
    setState("busy");
    try {
      if ((await Notification.requestPermission()) !== "granted") return setState("blocked");
      const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(key) }));
      const r = await saveChatDevice(sub.toJSON());
      if (!r.ok) { setError(r.message); return setState("error"); }
      setState("on");
    } catch {
      setError("This browser couldn't turn notifications on.");
      setState("error");
    }
  }

  async function disable() {
    setState("busy");
    const sub = await (await navigator.serviceWorker.getRegistration())?.pushManager.getSubscription();
    if (sub) await removeChatDevice(sub.endpoint);
    setState("off");
  }

  const text: Record<PushState, string> = {
    checking: "Checking notifications…",
    off: "Get a notification on this device for every new message.",
    on: "Notifications are on for this device.",
    busy: "One moment…",
    blocked: "Notifications are blocked for klymb.ai. Allow them in this browser's settings.",
    unsupported: "This browser can't show notifications.",
    "ios-install": "On iPhone: tap Share, then Add to Home Screen, and open Live chat from there to turn notifications on.",
    error: error || "That didn't work. Try again.",
  };

  return (
    <div className={clsx("mb-4 flex flex-wrap items-center gap-3 border px-4 py-3 text-sm", state === "on" ? "border-emerald-700/30 bg-emerald-50" : "border-line/40 bg-card")}>
      <span className="flex-1">{text[state]}</span>
      {(state === "off" || state === "error") && <button type="button" onClick={enable} className="bg-ink px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-paper">Turn on</button>}
      {state === "on" && <button type="button" onClick={disable} className="border border-line/50 px-3 py-1.5 text-xs font-bold">Turn off</button>}
    </div>
  );
}
