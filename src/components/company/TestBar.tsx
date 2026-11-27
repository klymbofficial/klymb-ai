"use client";

import { useEffect, useRef } from "react";

/**
 * The running test's top bar (user, 27 Nov: Submit at the top right, beside
 * the timer, as on HackerEarth): the test's name and rules on the left, the
 * time left and Submit on the right. It stays at the top while the candidate
 * scrolls. Submit opens a confirmation first; nothing is submitted by one press.
 */

export interface TestBarParts {
  /** The test's name, end time and proctoring chips (drawn on the server). */
  info: React.ReactNode;
  timer: React.ReactNode;
}

export const SUBMIT_BTN = "inline-flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-md border-2 border-red-strong bg-red-strong px-4 text-sm font-bold text-white hover:border-red-press hover:bg-red-press disabled:opacity-50";
const KEEP_BTN = "inline-flex min-h-11 items-center rounded-md border-2 border-ink bg-white px-5 text-sm font-bold hover:bg-ink hover:text-paper disabled:opacity-50";

export function TestBar({ parts, label, disabled, over, onSubmit }: { parts: TestBarParts; label: string; disabled: boolean; over: boolean; onSubmit: () => void }) {
  return (
    <div className="sticky top-3 z-30 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-xl border border-line/30 bg-white/95 px-4 py-3 shadow-card backdrop-blur sm:px-5">
      <div className="min-w-0 flex-1">{parts.info}</div>
      <div className="flex items-center gap-3">
        {parts.timer}
        {over
          ? <span className="text-sm font-bold text-error">Time is up</span>
          : <button type="button" onClick={onSubmit} disabled={disabled} className={SUBMIT_BTN}>{label}</button>}
      </div>
    </div>
  );
}

/** "Submit now?": what's still unanswered, then Yes or Keep working. */
export function SubmitDialog({ open, warning, pending, blocked, onConfirm, onCancel }: {
  open: boolean;
  /** What isn't answered yet, or null. */
  warning: string | null;
  pending: boolean;
  /** A file is still uploading. */
  blocked: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const keep = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    keep.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape" && !pending) onCancel(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open, pending, onCancel]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div role="alertdialog" aria-modal="true" aria-labelledby="submit-title" aria-describedby="submit-body" className="w-full max-w-md rounded-xl bg-paper p-6 shadow-2xl">
        <h2 id="submit-title" className="display text-xl">Submit your test?</h2>
        <div id="submit-body" className="mt-2 text-sm">
          <p>You can&apos;t change any answer after submitting.</p>
          {warning && <p className="mt-2 font-semibold text-error">{warning}</p>}
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button ref={keep} type="button" onClick={onCancel} disabled={pending} className={KEEP_BTN}>Keep working</button>
          <button type="button" onClick={onConfirm} disabled={pending || blocked} className={SUBMIT_BTN.replace("min-h-10", "min-h-11 px-5")}>
            {blocked ? "Wait for the file…" : pending ? "Submitting…" : "Yes, submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
