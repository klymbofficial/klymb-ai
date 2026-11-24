"use client";

import clsx from "clsx";
import { startTransition, useActionState, useCallback, useEffect, useRef, useState } from "react";
import { completeReview, type ReviewResult } from "@/app/org/[slug]/(workspace)/hiring/[batch]/candidates/[candidate]/actions";
import { BTN_PRIMARY } from "@/components/company/HiringParts";
import { REVIEW_LIMITS, scoreText, type RubricItem } from "@/lib/company/review-rules";

/**
 * The reviewer's scoring form: every criterion of the pinned rubric with its
 * guide, whole points from 0 to its maximum, an optional note, and a
 * summary. Starts from the latest review when there is one, so revising
 * means changing what's there. The server checks everything again.
 */
export function ReviewForm({ slug, batchId, candidateId, rubric, baseRevision, initial }: {
  slug: string;
  batchId: string;
  candidateId: string;
  rubric: RubricItem[];
  baseRevision: number;
  initial: { points: (number | null)[]; notes: string[]; summary: string };
}) {
  const [state, action, pending] = useActionState<ReviewResult | null, FormData>(completeReview, null);
  const form = useRef<HTMLFormElement>(null);
  const [points, setPoints] = useState<(number | null)[]>(initial.points);
  // The total is read from the form itself, so a choice made before the page finished loading still counts.
  const recount = useCallback(() => {
    if (!form.current) return;
    const data = new FormData(form.current);
    setPoints(rubric.map((_, i) => { const v = data.get(`points-${i}`); return typeof v === "string" ? Number(v) : null; }));
  }, [rubric]);
  useEffect(() => { const id = window.requestAnimationFrame(recount); return () => window.cancelAnimationFrame(id); }, [recount]);
  const total = points.reduce<number>((n, p) => n + (p ?? 0), 0);
  const max = rubric.reduce((n, c) => n + c.points, 0);
  const scored = points.filter((p) => p !== null).length;
  const errors = state && !state.ok ? state.errors ?? {} : {};

  return (
    // Submitted by hand, not through the form's action prop, so React doesn't clear the scores when the server says "check these".
    <form
      ref={form}
      method="post"
      onSubmit={(e) => { e.preventDefault(); const data = new FormData(e.currentTarget); startTransition(() => action(data)); }}
      onChange={recount}
      className="flex flex-col gap-5"
      noValidate
    >
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="batchId" value={batchId} />
      <input type="hidden" name="candidateId" value={candidateId} />
      <input type="hidden" name="baseRevision" value={baseRevision} />

      {rubric.map((c, i) => (
        <fieldset key={i} className={clsx("rounded-md border p-4", errors[i] ? "border-error" : "border-line/30")}>
          <legend className="float-left w-full text-sm font-bold">{c.title} <span className="font-normal text-muted">· {c.skill} · up to {c.points}</span></legend>
          <p className="clear-both whitespace-pre-line pt-1 text-xs leading-relaxed text-muted"><span className="font-bold text-ink">Guide: </span>{c.guide}</p>
          <div role="radiogroup" aria-label={`${c.title} points`} className="mt-3 flex flex-wrap gap-1.5">
            {Array.from({ length: c.points + 1 }, (_, n) => (
              <label key={n} className={clsx(
                "inline-flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-md border-2 border-line/40 bg-white px-2 text-sm font-bold hover:border-ink",
                "has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-paper has-[:focus-visible]:outline has-[:focus-visible]:outline-2",
              )}>
                <input
                  type="radio"
                  name={`points-${i}`}
                  value={n}
                  defaultChecked={initial.points[i] === n}
                  className="sr-only"
                />
                {n}
              </label>
            ))}
          </div>
          <label className="mt-3 block text-xs font-bold text-muted" htmlFor={`note-${i}`}>Note (optional)</label>
          <textarea id={`note-${i}`} name={`note-${i}`} defaultValue={initial.notes[i] ?? ""} maxLength={REVIEW_LIMITS.note} rows={2}
            className="mt-1 w-full rounded-md border-2 border-line/40 bg-white p-2 text-sm focus:border-ink" />
          {errors[i] && <p role="alert" className="mt-1 text-xs font-semibold text-error">{errors[i]}</p>}
        </fieldset>
      ))}

      <div>
        <label className="block text-sm font-bold" htmlFor="summary">Summary (optional)</label>
        <textarea id="summary" name="summary" defaultValue={initial.summary} maxLength={REVIEW_LIMITS.summary} rows={4}
          className="mt-1 w-full rounded-md border-2 border-line/40 bg-white p-2 text-sm focus:border-ink" />
        {errors.summary && <p role="alert" className="mt-1 text-xs font-semibold text-error">{errors.summary}</p>}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/20 pt-4">
        <p className="text-sm"><span className="font-bold">Total {scoreText(total, max)}</span> <span className="text-muted">· {scored} of {rubric.length} scored</span></p>
        <button type="submit" disabled={pending} className={BTN_PRIMARY}>
          {pending ? "Saving…" : baseRevision ? "Save revised review" : "Complete review"}
        </button>
      </div>
      <p className="-mt-2 text-xs text-muted">A score doesn&apos;t shortlist or reject anyone; the recruiter decides.</p>
      {state && <p role={state.ok ? "status" : "alert"} className={clsx("text-sm", state.ok ? "font-semibold text-ink" : "font-semibold text-error")}>{state.message}</p>}
    </form>
  );
}
