"use client";

import clsx from "clsx";
import { startTransition, useActionState } from "react";
import { decideCandidate, shareCandidateResult, type DecisionResult } from "@/app/org/[slug]/(workspace)/assessments/[item]/candidates/[candidate]/actions";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/components/company/HiringParts";
import { DECISION_LABEL, DECISION_REASON_MAX, HIRING_DECISIONS, type HiringDecision } from "@/lib/company/review-rules";

interface Ids {
  slug: string;
  batchId: string;
  candidateId: string;
}

const hidden = (ids: Ids) => (
  <>
    <input type="hidden" name="slug" value={ids.slug} />
    <input type="hidden" name="batchId" value={ids.batchId} />
    <input type="hidden" name="candidateId" value={ids.candidateId} />
  </>
);

const Message = ({ state }: { state: DecisionResult | null }) =>
  state ? <p role={state.ok ? "status" : "alert"} className={clsx("text-sm font-semibold", state.ok ? "text-ink" : "text-error")}>{state.message}</p> : null;

/**
 * The recruiter's decision: Shortlisted, Not shortlisted or On hold, with a
 * reason. Nothing is pre-chosen from the score. Before any review, it warns
 * and still allows it (user decision, 24 Nov). Every decision is kept.
 */
export function DecisionForm({ ids, baseRevision, current, reviewed }: { ids: Ids; baseRevision: number; current: HiringDecision | null; reviewed: boolean }) {
  const [state, action, pending] = useActionState<DecisionResult | null, FormData>(decideCandidate, null);
  const errors = state && !state.ok ? state.errors ?? {} : {};
  return (
    <form
      method="post"
      onSubmit={(e) => { e.preventDefault(); const data = new FormData(e.currentTarget); startTransition(() => action(data)); }}
      className="flex flex-col gap-4"
      noValidate
    >
      {hidden(ids)}
      <input type="hidden" name="baseRevision" value={baseRevision} />
      {!reviewed && (
        <p className="rounded-md border-l-4 border-[#c77700] bg-[#fdf1e7] px-3 py-2 text-sm">
          <strong>Not reviewed yet.</strong> You can still decide; the history will show it was decided before a review.
        </p>
      )}
      <fieldset>
        <legend className="text-sm font-bold">Decision</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {HIRING_DECISIONS.map((d) => (
            <label key={d} className={clsx(
              "inline-flex min-h-10 cursor-pointer items-center rounded-md border-2 border-line/40 bg-white px-3 text-sm font-bold hover:border-ink",
              "has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-paper has-[:focus-visible]:outline has-[:focus-visible]:outline-2",
            )}>
              <input type="radio" name="decision" value={d} defaultChecked={current === d} className="sr-only" />
              {DECISION_LABEL[d]}
            </label>
          ))}
        </div>
        {errors.decision && <p role="alert" className="mt-1 text-xs font-semibold text-error">{errors.decision}</p>}
      </fieldset>
      <div>
        <label htmlFor="decision-reason" className="block text-sm font-bold">Reason</label>
        <textarea id="decision-reason" name="reason" rows={3} maxLength={DECISION_REASON_MAX} required
          className={clsx("mt-1 w-full rounded-md border-2 bg-white p-2 text-sm focus:border-ink", errors.reason ? "border-error" : "border-line/40")} />
        <p className="mt-1 text-xs text-muted">Kept with the decision. The candidate never sees it.</p>
        {errors.reason && <p role="alert" className="mt-1 text-xs font-semibold text-error">{errors.reason}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={BTN_PRIMARY}>{pending ? "Saving…" : current ? "Record new decision" : "Record decision"}</button>
      </div>
      <Message state={state} />
    </form>
  );
}

/** Shares the newest review with the candidate. Says exactly what they will see first. */
export function ShareForm({ ids, label, disabled }: { ids: Ids; label: string; disabled: boolean }) {
  const [state, action, pending] = useActionState<DecisionResult | null, FormData>(shareCandidateResult, null);
  return (
    <form method="post" onSubmit={(e) => { e.preventDefault(); const data = new FormData(e.currentTarget); startTransition(() => action(data)); }} className="flex flex-col gap-3">
      {hidden(ids)}
      <div><button type="submit" disabled={disabled || pending} className={BTN_SECONDARY}>{pending ? "Sharing…" : label}</button></div>
      <Message state={state} />
    </form>
  );
}
