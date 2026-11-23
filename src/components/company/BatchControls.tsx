"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  cancelHiringBatch, cancelInvitation, changeCandidate, remindCandidates, retryDelivery, sendHiringBatch, type ActionResult,
} from "@/app/org/[slug]/(workspace)/hiring/actions";
import { BTN_PRIMARY as primary, BTN_SECONDARY as secondary } from "@/components/company/HiringParts";
import { BATCH_LIMITS } from "@/lib/company/batch-rules";

const link = "text-xs font-bold underline underline-offset-4 hover:text-red-deep disabled:opacity-50";
const input = "w-full rounded-md border-2 border-line/50 bg-white px-3 py-2 text-sm focus:border-ink";

/** Runs one action, holds the button while it works, and shows what happened. */
function useAction() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function run(fn: () => Promise<ActionResult>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return false;
    setBusy(true);
    setMsg(null);
    try {
      const out = await fn();
      setMsg({ ok: out.ok, text: out.message });
      return out.ok;
    } catch {
      setMsg({ ok: false, text: "That didn't work just now. Try again in a minute." });
      return false;
    } finally {
      setBusy(false);
    }
  }
  const note = msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm font-semibold ${msg.ok ? "" : "text-error"}`}>{msg.text}</p>;
  return { busy, run, note };
}

/** The draft's one main action, and the way to throw it away. */
export function SendDraft({ slug, batchId, count, passed = 0 }: { slug: string; batchId: string; count: number; passed?: number }) {
  const { busy, run, note } = useAction();
  const who = count === 1 ? "1 invitation" : `${count} invitations`;
  const left = passed ? ` ${passed === 1 ? "1 person" : `${passed} people`} whose time to start has passed won't be sent one.` : "";
  return (
    <div className="flex max-w-md flex-col items-start gap-3 lg:items-end">
      {count === 0 && (
        <p role="note" className="max-w-2xl text-sm font-semibold text-error">
          Nobody in this batch can start in time any more, so there is nothing to send. Discard this draft and make a new batch with a later closing time.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        {count > 0 && (
          <button type="button" className={primary} disabled={busy} onClick={() => run(() => sendHiringBatch(slug, batchId), `Send ${who} now?${left}`)}>
            {busy ? "Sending…" : `Send ${who}`}
          </button>
        )}
        <button type="button" className={link} disabled={busy} onClick={() => run(() => cancelHiringBatch(slug, batchId), "Discard this draft? Nothing has been sent.")}>
          Discard draft
        </button>
      </div>
      {note}
    </div>
  );
}

/**
 * Actions on the whole sent batch. The one that most needs doing is the
 * primary button: retrying failed invitations when there are any, otherwise
 * reminding. Cancelling the batch sits in a menu, out of the way.
 */
export function BatchButtons({ slug, batchId, failed, remindable }: { slug: string; batchId: string; failed: number; remindable: number }) {
  const { busy, run, note } = useAction();
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  // The menu closes on Escape (focus back on its button) and on a click outside it.
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setMenu(false); toggle.current?.focus(); } };
    const onClick = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onClick); };
  }, [menu]);

  const remindLabel = `Remind ${remindable === 1 ? "1 person" : `${remindable} people`} who can start`;
  return (
    <div className="flex max-w-md flex-col items-start gap-3 lg:items-end">
      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        {remindable > 0 && (
          <button type="button" className={failed > 0 ? secondary : primary} disabled={busy} onClick={() => run(() => remindCandidates(slug, batchId, null), `Email a reminder to ${remindable === 1 ? "1 person" : `${remindable} people`} who can still start?`)}>
            {remindLabel}
          </button>
        )}
        {failed > 0 && (
          <button type="button" className={primary} disabled={busy} onClick={() => run(() => retryDelivery(slug, batchId, null))}>
            Retry {failed === 1 ? "1 failed invitation" : `${failed} failed invitations`}
          </button>
        )}
        <div ref={menuRef} className="relative">
          <button
            ref={toggle}
            type="button"
            aria-label="More batch actions"
            aria-expanded={menu}
            aria-haspopup="menu"
            disabled={busy}
            onClick={() => setMenu(!menu)}
            className="flex h-10 w-10 items-center justify-center rounded-md border-2 border-line/50 bg-white text-lg font-bold leading-none hover:border-ink"
          >
            ⋯
          </button>
          {menu && (
            <div role="menu" className="absolute right-0 top-12 z-20 min-w-48 rounded-lg border border-line/40 bg-white p-1 shadow-lg">
              <button
                type="button"
                role="menuitem"
                autoFocus
                className="block w-full rounded-md px-3 py-2 text-left text-sm font-semibold text-error hover:bg-error-tint"
                onClick={() => { setMenu(false); void run(() => cancelHiringBatch(slug, batchId), "Cancel the whole batch? No link in it will start the test. Candidates aren't emailed."); }}
              >
                Cancel batch…
              </button>
            </div>
          )}
        </div>
      </div>
      {note}
    </div>
  );
}

/** One person's actions. What shows depends on where their invitation stands. */
export function CandidateActions({
  slug, batchId, candidateId, name, retry, fixEmail, remind, timeZone, extraMinutes, lastStartInput, newLink = true, passed = false,
}: {
  slug: string;
  batchId: string;
  candidateId: string;
  name: string;
  retry: boolean;
  fixEmail: boolean;
  remind: boolean;
  timeZone: string;
  extraMinutes: number;
  /** Their own last start as a datetime-local value in the batch's zone, or "" for the batch's rule. */
  lastStartInput: string;
  /** Whether a new link can go out: not once their time to start has passed. */
  newLink?: boolean;
  /** Their time to start has passed: Change time is the way to send them a working link. */
  passed?: boolean;
}) {
  const { busy, run, note } = useAction();
  const [open, setOpen] = useState<"none" | "email" | "time">("none");
  const [email, setEmail] = useState("");
  const [extra, setExtra] = useState(String(extraMinutes));
  const [until, setUntil] = useState(lastStartInput);
  const id = useId();

  const done = (ok: boolean) => { if (ok) setOpen("none"); };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {retry && <button type="button" className={link} disabled={busy} onClick={() => run(() => retryDelivery(slug, batchId, candidateId))}>Retry</button>}
        {fixEmail && <button type="button" className={link} disabled={busy} aria-expanded={open === "email"} onClick={() => setOpen(open === "email" ? "none" : "email")}>Fix email</button>}
        {remind && <button type="button" className={link} disabled={busy} onClick={() => run(() => remindCandidates(slug, batchId, candidateId))}>Remind</button>}
        <button type="button" className={link} disabled={busy} aria-expanded={open === "time"} onClick={() => setOpen(open === "time" ? "none" : "time")}>Change time</button>
        {newLink && <button type="button" className={link} disabled={busy} onClick={() => run(() => changeCandidate(slug, batchId, candidateId, { kind: "new_link" }), `Send ${name} a new link? Their current link stops working.`)}>New link</button>}
        <button type="button" className={link} disabled={busy} onClick={() => run(() => cancelInvitation(slug, batchId, candidateId), `Cancel ${name}'s invitation? Their link won't start the test. They aren't emailed.`)}>Cancel</button>
      </div>
      {passed && open === "none" && <p className="text-xs text-muted">Their time to start has passed. Change time to give them a later start; that emails them a working link.</p>}

      {open === "email" && (
        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={async (e) => { e.preventDefault(); done(await run(() => changeCandidate(slug, batchId, candidateId, { kind: "email", email }))); }}
        >
          <label htmlFor={`${id}-email`} className="flex flex-1 flex-col gap-1 text-xs font-bold">
            Correct email
            <input id={`${id}-email`} type="email" className={input} value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <button type="submit" className={secondary} disabled={busy}>Save and send</button>
        </form>
      )}

      {open === "time" && (
        <form
          className="flex flex-col gap-2"
          onSubmit={async (e) => { e.preventDefault(); done(await run(() => changeCandidate(slug, batchId, candidateId, { kind: "extension", extraMinutes: extra, lastStart: until }))); }}
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <label htmlFor={`${id}-extra`} className="flex flex-col gap-1 text-xs font-bold">
              Extra minutes once they start
              <input id={`${id}-extra`} type="number" min={0} max={BATCH_LIMITS.extraMinutes} step={1} className={input} value={extra} onChange={(e) => setExtra(e.target.value)} />
            </label>
            <label htmlFor={`${id}-until`} className="flex flex-col gap-1 text-xs font-bold">
              Later last start (optional, {timeZone.replace(/_/g, " ")})
              <input id={`${id}-until`} type="datetime-local" className={input} value={until} onChange={(e) => setUntil(e.target.value)} />
            </label>
          </div>
          <p className="text-xs text-muted">Leave the last start blank to keep the batch&apos;s rule: closing time minus their time allowed. They get an email with the new time.</p>
          <div><button type="submit" className={secondary} disabled={busy}>Save and email</button></div>
        </form>
      )}
      {note}
    </div>
  );
}
