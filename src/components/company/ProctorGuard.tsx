"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface ProctorConfig {
  fullscreen: boolean;
  tabs: boolean;
  copy: boolean;
  webcam: boolean;
  limit: number | null;
}

type Warn = { kind: "fullscreen_exit" | "tab_hidden" | "window_blur"; warnings: number; limit: number | null };

const WARN_TEXT: Record<Warn["kind"], string> = {
  fullscreen_exit: "You left full screen.",
  tab_hidden: "You switched away from the test.",
  window_blur: "You switched to another window.",
};
const SNAPSHOT_MS = 2 * 60 * 1000;

/**
 * The test window's proctoring (0070), from the company's settings: a
 * full-screen gate, warnings for leaving full screen or the tab, blocked
 * copy / paste / right-click, and webcam snapshots with a small self-view.
 * Every event goes to the server, which counts warnings and, at the
 * company's limit, submits the test; then this page moves to the receipt.
 * Browsers can't stop every workaround: these are signals for the reviewer.
 */
export function ProctorGuard({ token, attemptId, config, home, children }: { token: string; attemptId: string; config: ProctorConfig; home: string; children: React.ReactNode }) {
  const [inFull, setInFull] = useState(true);
  const [started, setStarted] = useState(!config.fullscreen);
  const [warn, setWarn] = useState<Warn | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [camera, setCamera] = useState<"off" | "on" | "denied" | "lost">("off");
  const video = useRef<HTMLVideoElement>(null);
  const lastHidden = useRef(0);
  const lastCopyNote = useRef(0);
  const leaving = useRef(false);

  const send = useCallback(async (kind: string) => {
    try {
      const res = await fetch(`/api/assessment/${token}/proctor`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ attemptId, kind }), keepalive: true });
      const out = await res.json().catch(() => null);
      if (out?.status === "recorded" && out.submitted) { leaving.current = true; window.location.assign(home); return null; }
      if (out?.status === "closed") { leaving.current = true; window.location.assign(home); return null; }
      return out?.status === "recorded" ? { warnings: out.warnings as number, limit: out.limit as number | null } : null;
    } catch {
      return null;
    }
  }, [token, attemptId, home]);

  const warnFor = useCallback(async (kind: Warn["kind"]) => {
    if (leaving.current) return;
    const out = await send(kind);
    if (out) setWarn({ kind, ...out });
  }, [send]);

  // Full screen: a gate until entered, and a warning each time it is left.
  useEffect(() => {
    if (!config.fullscreen) return;
    const sync = () => {
      const full = !!document.fullscreenElement;
      setInFull(full);
      if (full) setStarted(true);
    };
    const onChange = () => {
      const full = !!document.fullscreenElement;
      if (!full && !leaving.current) void warnFor("fullscreen_exit");
      sync();
    };
    sync();
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [config.fullscreen, warnFor]);

  // Tab and window switches: one warning per time away.
  useEffect(() => {
    if (!config.tabs) return;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") { lastHidden.current = Date.now(); void warnFor("tab_hidden"); }
    };
    const onBlur = () => {
      // A hidden tab also blurs the window; count it once. Full-screen exits are counted on their own.
      window.setTimeout(() => {
        if (document.visibilityState === "hidden" || Date.now() - lastHidden.current < 1500 || leaving.current) return;
        if (document.hasFocus()) return;
        void warnFor("window_blur");
      }, 300);
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    return () => { document.removeEventListener("visibilitychange", onVisibility); window.removeEventListener("blur", onBlur); };
  }, [config.tabs, warnFor]);

  // Copy, paste and right-click: blocked, noted, and recorded at most every few seconds.
  useEffect(() => {
    if (!config.copy) return;
    const block = (kind: "copy_blocked" | "paste_blocked" | "context_blocked", text: string) => (e: Event) => {
      e.preventDefault();
      setToast(text);
      if (Date.now() - lastCopyNote.current > 5000) { lastCopyNote.current = Date.now(); void send(kind); }
    };
    const onCopy = block("copy_blocked", "Copying is turned off for this test.");
    const onPaste = block("paste_blocked", "Pasting is turned off for this test.");
    const onMenu = block("context_blocked", "Right-click is turned off for this test.");
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onMenu);
    return () => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onMenu);
    };
  }, [config.copy, send]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(t);
  }, [toast]);

  // Webcam: a self-view and a snapshot every two minutes (the first soon after starting).
  useEffect(() => {
    if (!config.webcam) return;
    let stream: MediaStream | null = null;
    let timer = 0;
    let first = 0;
    let stopped = false;
    const shoot = async () => {
      const v = video.current;
      if (!v || v.readyState < 2) return;
      const c = document.createElement("canvas");
      c.width = 320;
      c.height = Math.round((320 * (v.videoHeight || 240)) / (v.videoWidth || 320));
      c.getContext("2d")?.drawImage(v, 0, 0, c.width, c.height);
      const blob: Blob | null = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.6));
      if (!blob) return;
      try {
        await fetch(`/api/assessment/${token}/snapshot?attempt=${attemptId}`, { method: "POST", headers: { "content-type": "image/jpeg" }, body: blob });
      } catch { /* the next one tries again */ }
    };
    navigator.mediaDevices?.getUserMedia({ video: { width: { ideal: 320 }, height: { ideal: 240 } }, audio: false })
      .then((s) => {
        if (stopped) { s.getTracks().forEach((t) => t.stop()); return; }
        stream = s;
        if (video.current) video.current.srcObject = s;
        setCamera("on");
        s.getVideoTracks()[0]?.addEventListener("ended", () => { setCamera("lost"); void send("webcam_lost"); });
        first = window.setTimeout(() => void shoot(), 5000);
        timer = window.setInterval(() => void shoot(), SNAPSHOT_MS);
      })
      .catch(() => { setCamera("denied"); void send("webcam_denied"); });
    return () => {
      stopped = true;
      window.clearTimeout(first);
      window.clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [config.webcam, token, attemptId, send]);

  const enterFull = () => { void document.documentElement.requestFullscreen?.().catch(() => setToast("Your browser didn't allow full screen. Try again, or use another browser.")); };
  const left = warn && warn.limit !== null ? Math.max(0, warn.limit - warn.warnings) : null;

  return (
    <>
      {children}

      {config.fullscreen && !inFull && (
        <div role="dialog" aria-modal="true" aria-labelledby="fs-title" className="fixed inset-0 z-[70] flex items-center justify-center bg-night p-6 text-paper">
          <div className="max-w-md text-center">
            <h2 id="fs-title" className="display text-2xl">{started ? "Return to full screen" : "This test runs in full screen"}</h2>
            <p className="mt-3 text-sm text-[#d9d6d5]">
              {started ? "Your answers are saved and the clock is still running. Go back to full screen to continue." : "Your clock has started. Enter full screen to see the questions."}
            </p>
            <button type="button" onClick={enterFull} autoFocus className="mt-6 inline-flex min-h-11 items-center rounded-md border-2 border-white bg-white px-6 text-base font-bold text-ink hover:bg-paper">
              {started ? "Return to full screen" : "Enter full screen"}
            </button>
          </div>
        </div>
      )}

      {warn && (inFull || !config.fullscreen) && (
        <div role="alertdialog" aria-modal="true" aria-labelledby="warn-title" className="fixed inset-0 z-[65] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg border-t-4 border-error bg-paper p-6 shadow-2xl">
            <h2 id="warn-title" className="text-lg font-bold">Warning{warn.limit !== null ? ` ${warn.warnings} of ${warn.limit}` : ""}</h2>
            <p className="mt-2 text-sm">{WARN_TEXT[warn.kind]} This is recorded for the company.</p>
            {left !== null && (
              <p className="mt-2 text-sm font-semibold text-error">
                {left === 0 ? "Your test is being submitted." : `${left} more and your test is submitted automatically with your saved answers.`}
              </p>
            )}
            <button type="button" autoFocus onClick={() => setWarn(null)} className="mt-5 inline-flex min-h-10 items-center rounded-md border-2 border-ink bg-ink px-5 text-sm font-bold text-paper">I understand</button>
          </div>
        </div>
      )}

      {toast && <p role="status" className="fixed bottom-6 left-1/2 z-[66] -translate-x-1/2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-paper shadow-lg">{toast}</p>}

      {config.webcam && (
        <div className="fixed bottom-4 left-4 z-[55] overflow-hidden rounded-lg border-2 border-white bg-night shadow-xl" aria-label="Camera">
          <video ref={video} autoPlay muted playsInline className="block h-20 w-28 object-cover" />
          <p className="flex items-center gap-1.5 px-2 py-1 text-[0.65rem] font-bold text-paper">
            <span className={`size-2 rounded-full ${camera === "on" ? "bg-[#3ec46d]" : "bg-error"}`} />
            {camera === "on" ? "Camera on" : camera === "denied" ? "Camera blocked" : camera === "lost" ? "Camera stopped" : "Starting camera…"}
          </p>
        </div>
      )}
    </>
  );
}

/** The proctoring in force, as small chips in the test's top bar. */
export function ProctorChips({ config }: { config: ProctorConfig }) {
  const chips = [config.fullscreen && "Full screen", config.tabs && "Tab switches recorded", config.copy && "Copy off", config.webcam && "Camera"].filter(Boolean) as string[];
  if (!chips.length) return null;
  return (
    <span className="hidden flex-wrap gap-1.5 md:flex" aria-label="Proctoring">
      {chips.map((c) => <span key={c} className="rounded-full border border-line/50 bg-white px-2 py-0.5 text-[0.7rem] font-semibold text-muted">{c}</span>)}
    </span>
  );
}
