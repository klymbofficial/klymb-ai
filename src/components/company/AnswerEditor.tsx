"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { saveAnswer } from "@/app/assessment/[token]/actions";
import { AUTOSAVE_MS, MAX_ANSWER_CHARS, type SaveState } from "@/lib/company/attempt-rules";

const RETRY_MS = [3000, 6000, 12000, 20000, 30000];

type Lock = "time" | "conflict" | "link" | "submitted";

/** What Submit asks of the answer box: save what's typed and say which saved revision it shows. */
export interface AnswerControl {
  flush(): Promise<{ ok: true; revision: number; empty: boolean } | { ok: false; why: Lock | "network" }>;
}

/**
 * The candidate's answer box. It saves on its own: within AUTOSAVE_MS of
 * the first unsaved change, when they leave the box, and when the tab is
 * hidden; and once more as the time runs out (the server accepts saves for
 * a short grace after the deadline). Every save names the revision it built
 * on, so if the test is open somewhere else and saved there, this box stops
 * and asks for a reload instead of overwriting. A failed save is retried
 * with growing gaps; the status line always says where the answer stands.
 */
export function AnswerEditor({
  token, attemptId, initialAnswer, initialRevision, initialSavedAt, deadline, serverNow, timeZone, controlRef,
}: {
  token: string;
  attemptId: string;
  initialAnswer: string;
  initialRevision: number;
  initialSavedAt: string | null;
  deadline: string;
  serverNow: string;
  /** The batch's zone: times are shown in it, the same on the server and in the browser. */
  timeZone: string;
  /** Filled in for the Submit panel. */
  controlRef?: Ref<AnswerControl>;
}) {
  const [text, setText] = useState(initialAnswer);
  const [state, setState] = useState<SaveState>(initialSavedAt ? "saved" : "idle");
  const [savedAt, setSavedAt] = useState<string | null>(initialSavedAt);
  const [locked, setLockedState] = useState<Lock | null>(null);
  const lockedRef = useRef<Lock | null>(null);
  // The first reason wins: a conflict found at the deadline stays a conflict.
  const lock = useCallback((why: Lock) => { lockedRef.current = lockedRef.current ?? why; setLockedState((l) => l ?? why); }, []);

  const textRef = useRef(initialAnswer);
  const savedText = useRef(initialAnswer);
  const revision = useRef(initialRevision);
  const inFlight = useRef(false);
  const again = useRef(false);
  const timer = useRef<number | null>(null);
  const failures = useRef(0);
  const [skew] = useState(() => new Date(serverNow).getTime() - Date.now());
  // save() retries itself; it reaches its latest self through this ref.
  const saveRef = useRef<() => Promise<void>>(async () => {});

  const save = useCallback(async () => {
    if (timer.current) { window.clearTimeout(timer.current); timer.current = null; }
    if (inFlight.current) { again.current = true; return; }
    const snapshot = textRef.current;
    if (snapshot === savedText.current) { setState((s) => (s === "dirty" || s === "retrying" ? "saved" : s)); return; }
    inFlight.current = true;
    setState("saving");
    let out: Awaited<ReturnType<typeof saveAnswer>> | null = null;
    try {
      out = await saveAnswer(token, attemptId, revision.current, snapshot);
    } catch {
      out = null;
    }
    inFlight.current = false;
    if (out && out.status === "saved") {
      failures.current = 0;
      revision.current = out.revision;
      savedText.current = snapshot;
      setSavedAt(out.savedAt);
      setState(textRef.current === snapshot ? "saved" : "dirty");
      if (textRef.current !== snapshot || again.current) { again.current = false; void saveRef.current(); }
      return;
    }
    if (out && out.status === "conflict") { lock("conflict"); setState("conflict"); return; }
    if (out && out.status === "closed") { lock("time"); setState("closed"); return; }
    if (out && out.status === "submitted") { lock("submitted"); setState("closed"); return; }
    if (out && out.status === "refused") { lock("link"); setState("closed"); return; }
    // Network trouble or a server error: keep the text and try again, waiting longer each time.
    const wait = RETRY_MS[Math.min(failures.current, RETRY_MS.length - 1)];
    failures.current += 1;
    setState("retrying");
    timer.current = window.setTimeout(() => void saveRef.current(), wait);
  }, [token, attemptId, lock]);
  useEffect(() => { saveRef.current = save; }, [save]);

  // For Submit: wait for a save in flight, save what's left, and report the revision now on the server.
  useImperativeHandle(controlRef, () => ({
    async flush() {
      for (let tries = 0; tries < 4; tries += 1) {
        while (inFlight.current) await new Promise((r) => window.setTimeout(r, 150));
        if (lockedRef.current) return { ok: false, why: lockedRef.current };
        if (textRef.current === savedText.current) return { ok: true, revision: revision.current, empty: !savedText.current.trim() };
        await save();
      }
      return { ok: false, why: lockedRef.current ?? "network" };
    },
  }), [save]);

  const schedule = useCallback(() => {
    if (!timer.current && !inFlight.current) timer.current = window.setTimeout(() => void save(), AUTOSAVE_MS);
  }, [save]);

  // When the time runs out: one last save (inside the server's grace), then the box closes.
  useEffect(() => {
    const ms = new Date(deadline).getTime() - (Date.now() + skew);
    const id = window.setTimeout(async () => {
      await save();
      lock("time");
      setState((s) => (s === "conflict" ? s : "closed"));
    }, Math.max(0, ms));
    return () => window.clearTimeout(id);
  }, [deadline, skew, save, lock]);

  // Leaving the tab saves; closing it with unsaved text asks first.
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === "hidden") void save(); };
    const onLeave = (e: BeforeUnloadEvent) => { if (textRef.current !== savedText.current && !locked) e.preventDefault(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onLeave);
    return () => { document.removeEventListener("visibilitychange", onHide); window.removeEventListener("beforeunload", onLeave); };
  }, [save, locked]);

  const at = savedAt ? new Intl.DateTimeFormat("en-GB", { timeZone, hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true }).format(new Date(savedAt)) : null;
  const status =
    locked === "conflict" ? "This test was saved in another tab or device. Reload this page to carry on with the latest answer; what you typed here since then isn't saved."
      : locked === "link" ? "This link no longer opens the test. Your last saved answer is kept."
        : locked === "submitted" ? "This test has been submitted, so the answer can't change. Reload to see your receipt."
        : locked === "time" ? `Time is up. ${at ? `Your answer as saved at ${at} is what counts.` : "Nothing was saved."}`
          : state === "saving" ? "Saving…"
            : state === "retrying" ? "Not saved yet — trying again. Keep this page open."
              : state === "dirty" ? "Unsaved changes"
                : at ? `Saved at ${at}` : "Not saved yet";
  const warn = locked === "conflict" || state === "retrying";

  return (
    <section aria-labelledby="answer-label" className="card p-6">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <label id="answer-label" htmlFor="answer" className="display text-lg">Your answer</label>
        <p role="status" aria-live="polite" className={`text-sm ${warn ? "font-semibold text-error" : "text-muted"}`}>{status}</p>
      </div>
      <textarea
        id="answer"
        value={text}
        readOnly={!!locked}
        maxLength={MAX_ANSWER_CHARS}
        onChange={(e) => {
          textRef.current = e.target.value;
          setText(e.target.value);
          setState("dirty");
          schedule();
        }}
        onBlur={() => void save()}
        rows={18}
        spellCheck
        className="min-h-72 w-full resize-y rounded-md border-2 border-line/50 bg-white p-3 text-sm leading-relaxed focus:border-ink read-only:bg-paper"
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>{text.length.toLocaleString()} / {MAX_ANSWER_CHARS.toLocaleString()} characters</span>
        {locked === "conflict" ? (
          <button type="button" onClick={() => window.location.reload()} className="font-bold text-ink underline underline-offset-4">Reload</button>
        ) : !locked ? (
          <button type="button" onClick={() => void save()} disabled={state === "saving"} className="font-bold text-ink underline underline-offset-4 disabled:opacity-50">Save now</button>
        ) : null}
      </div>
    </section>
  );
}
