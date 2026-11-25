"use client";

import { useId, useState } from "react";
import { reviewAssessment } from "@/app/org/[slug]/(workspace)/assessments/actions";
import type { ReviewRow } from "@/lib/company/assessment-rules";

const primary = "border-2 border-red-strong bg-red-strong px-5 py-2.5 text-sm font-bold text-white hover:border-red-press hover:bg-red-press disabled:opacity-50";
const secondary = "border-2 border-ink px-5 py-2.5 text-sm font-bold hover:bg-ink hover:text-paper disabled:opacity-50";

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

/**
 * A reviewer's decision on the newest version, for their company. Approve is
 * the one main action; declining asks what Klymb should change. A decision
 * already made is shown with a way to change it.
 */
export function ReviewPanel({
  slug, item, versionId, version, review, inUse,
}: {
  slug: string;
  item: string;
  versionId: string;
  version: number;
  review: ReviewRow | null;
  /** The version recruiters use now, if any. */
  inUse: number | null;
}) {
  const [mode, setMode] = useState<"idle" | "decline">("idle");
  const [changing, setChanging] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const noteId = useId();

  async function decide(decision: "approved" | "declined") {
    setBusy(true);
    setMsg(null);
    const out = await reviewAssessment(slug, item, versionId, { decision, note: decision === "declined" ? note : "" });
    setBusy(false);
    setMsg({ ok: out.ok, text: out.message });
    if (out.ok) {
      setMode("idle");
      setChanging(false);
      setNote("");
    }
  }

  const deciding = !review || changing;

  return (
    <section aria-labelledby="review-title" className="mb-8 border-2 border-ink bg-white p-5">
      <h2 id="review-title" className="text-base font-bold">
        {review && !changing
          ? review.decision === "approved"
            ? `You approved version ${version}`
            : `Version ${version} was declined`
          : `Review version ${version}`}
      </h2>

      {review && !changing && (
        <p className="mt-1 text-sm">
          {review.decidedBy} · {day(review.decidedAt)}
          {review.note && <span className="mt-1 block text-muted">“{review.note}”</span>}
        </p>
      )}

      {deciding && (
        <p className="mt-1 text-sm">
          Read the full test and what candidates see. Once you approve it, recruiters can pick this version.
          {inUse && inUse !== version && ` Until then they use version ${inUse}.`}
        </p>
      )}

      {deciding && mode === "decline" && (
        <label htmlFor={noteId} className="mt-4 flex flex-col gap-1 text-xs font-bold">
          What should Klymb change?
          <textarea
            id={noteId}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={1000}
            className="border border-line/60 bg-white px-3 py-2 text-sm font-normal focus:border-ink focus:outline-none"
          />
        </label>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {deciding && mode === "idle" && (
          <>
            <button type="button" className={primary} disabled={busy} onClick={() => decide("approved")}>{busy ? "Saving…" : `Approve version ${version}`}</button>
            <button type="button" className={secondary} disabled={busy} onClick={() => { setMode("decline"); setMsg(null); }}>Decline</button>
          </>
        )}
        {deciding && mode === "decline" && (
          <>
            <button type="button" className={primary} disabled={busy || !note.trim()} onClick={() => decide("declined")}>{busy ? "Saving…" : `Decline version ${version}`}</button>
            <button type="button" className={secondary} disabled={busy} onClick={() => setMode("idle")}>Back</button>
          </>
        )}
        {deciding && changing && mode === "idle" && (
          <button type="button" className="px-2 text-sm font-bold underline underline-offset-4" onClick={() => setChanging(false)}>Keep my decision</button>
        )}
        {!deciding && (
          <button type="button" className={secondary} onClick={() => { setChanging(true); setMsg(null); }}>Change decision</button>
        )}
      </div>

      {msg && <p role={msg.ok ? "status" : "alert"} className={`mt-3 text-sm font-semibold ${msg.ok ? "" : "text-error"}`}>{msg.text}</p>}
    </section>
  );
}
