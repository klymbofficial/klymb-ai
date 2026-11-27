"use client";

import clsx from "clsx";
import { startTransition, useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { completeReview, suggestReviewScores, type ReviewResult } from "@/app/org/[slug]/(workspace)/assessments/[item]/candidates/[candidate]/actions";
import type { Suggestion } from "@/lib/company/ai-review-rules";
import { BTN_PRIMARY } from "@/components/company/HiringParts";
import { REVIEW_LIMITS, scoreText, type RubricItem } from "@/lib/company/review-rules";

/**
 * The reviewer's scoring form: every criterion of the pinned rubric with its
 * guide, whole points from 0 to its maximum, an optional note, and a
 * summary. Starts from the latest review when there is one, so revising
 * means changing what's there. A test with questions (L3) lists each
 * multiple-choice question with its automatic mark preselected, and each
 * written question's areas under its heading. The server checks everything
 * again. When the company allows it (Settings › AI features), "Suggest scores
 * with AI" proposes points for each written area with the candidate's own
 * supporting lines and what's missing; the reviewer uses or ignores each one,
 * and only their saved review counts.
 */
export function ReviewForm({ slug, batchId, candidateId, rubric, baseRevision, initial, autos, ai = false }: {
  slug: string;
  batchId: string;
  candidateId: string;
  /** A test with questions (L3): one entry per multiple-choice question and per rubric area of the others. */
  rubric: RubricItem[];
  baseRevision: number;
  initial: { points: (number | null)[]; notes: string[]; summary: string };
  /** Each entry's automatic mark (multiple choice), or null. A changed mark needs a reason. */
  autos?: (number | null)[];
  /** The company allows AI suggestions and there are written answers to read. */
  ai?: boolean;
}) {
  const [state, action, pending] = useActionState<ReviewResult | null, FormData>(completeReview, null);
  const form = useRef<HTMLFormElement>(null);
  const [points, setPoints] = useState<(number | null)[]>(initial.points);
  // The total is read from the form itself, so a choice made before the page finished loading still counts.
  const recount = useCallback(() => {
    if (!form.current) return;
    const data = new FormData(form.current);
    setPoints(rubric.map((_, i) => { const v = data.get(`points-${i}`); return typeof v === "string" && v.trim() !== "" ? Number(v) : null; }));
  }, [rubric]);
  useEffect(() => { const id = window.requestAnimationFrame(recount); return () => window.cancelAnimationFrame(id); }, [recount]);
  const total = points.reduce<number>((n, p) => n + (p ?? 0), 0);
  const max = rubric.reduce((n, c) => n + c.points, 0);
  const scored = points.filter((p) => p !== null).length;
  const errors = state && !state.ok ? state.errors ?? {} : {};

  const [suggested, setSuggested] = useState<Map<number, Suggestion> | null>(null);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [asking, ask] = useTransition();
  const askAi = () => {
    // Cleared at once: updates inside the transition only show when it ends.
    setAiNote(null);
    ask(async () => {
    try {
      const out = await suggestReviewScores(slug, batchId, candidateId);
      if (!out.ok) { setAiNote(out.message); return; }
      setSuggested(new Map(out.suggestions.map((x) => [x.index, x])));
      setAiNote(`${out.suggestions.length} ${out.suggestions.length === 1 ? "suggestion" : "suggestions"} below. Check each one against the answer before you use it.`);
    } catch {
      setAiNote("Suggestions aren't available just now. Score as usual.");
    }
    });
  };
  /** Puts a suggested score into the form, as if the reviewer had picked it. */
  const use = (i: number, n: number) => {
    const f = form.current;
    if (!f) return;
    const radio = f.querySelector<HTMLInputElement>(`input[type=radio][name="points-${i}"][value="${n}"]`);
    if (radio) radio.checked = true;
    const box = f.querySelector<HTMLInputElement>(`input[type=number][name="points-${i}"]`);
    if (box) box.value = String(n);
    recount();
  };
  const useAll = () => suggested?.forEach((x) => use(x.index, x.points));

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

      {ai && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-line/30 bg-white p-3 text-sm">
          <button type="button" onClick={askAi} disabled={asking} className="inline-flex min-h-9 items-center gap-2 rounded-md border-2 border-ink bg-white px-3 font-bold hover:bg-ink hover:text-paper disabled:opacity-50">
            {asking ? "Reading the answers…" : suggested ? "Suggest again" : "Suggest scores with AI"}
          </button>
          {suggested && suggested.size > 0 && <button type="button" onClick={useAll} className="font-semibold underline underline-offset-4">Use all suggestions</button>}
          <span className="min-w-[12rem] flex-1 text-xs text-muted" role="status">{aiNote ?? "Proposes points for each written area with the lines that support them. You decide every score."}</span>
        </div>
      )}

      {rubric.map((c, i) => {
        const auto = autos?.[i] ?? null;
        const changed = auto !== null && points[i] !== null && points[i] !== auto;
        const heading = c.questionNo != null && c.questionNo !== rubric[i - 1]?.questionNo;
        return (
          <div key={i} className="contents">
            {heading && !c.mcq && (
              <h3 className="-mb-2 text-sm font-bold">{c.questionNo}. {c.question} <span className="font-normal text-muted">· written</span></h3>
            )}
            <fieldset className={clsx("rounded-md border p-4", errors[i] ? "border-error" : "border-line/30")}>
              <legend className="float-left w-full text-sm font-bold">
                {c.mcq ? `${c.questionNo}. ${c.title}` : c.title}{" "}
                <span className="font-normal text-muted">· {c.mcq ? "multiple choice" : c.skill} · up to {c.points}</span>
              </legend>
              {c.mcq ? (
                <p className="clear-both pt-1 text-xs text-muted">
                  <span className="font-bold text-ink">Automatic mark: {auto} / {c.points}.</span> Keep it, or change it and say why.
                </p>
              ) : (
                <p className="clear-both whitespace-pre-line pt-1 text-xs leading-relaxed text-muted"><span className="font-bold text-ink">Guide: </span>{c.guide}</p>
              )}
              {suggested?.get(i) && <AiHint s={suggested.get(i)!} onUse={() => use(i, suggested.get(i)!.points)} />}
              {c.points > 10 ? (
                <input
                  type="number" name={`points-${i}`} min={0} max={c.points} step={1} inputMode="numeric"
                  defaultValue={initial.points[i] ?? ""} aria-label={`${c.title} points`}
                  className="mt-3 w-28 rounded-md border-2 border-line/40 bg-white px-2 py-1.5 text-sm font-bold focus:border-ink"
                />
              ) : (
                <div role="radiogroup" aria-label={`${c.title} points`} className="mt-3 flex flex-wrap gap-1.5">
                  {Array.from({ length: c.points + 1 }, (_, n) => (
                    <label key={n} className={clsx(
                      "inline-flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-md border-2 border-line/40 bg-white px-2 text-sm font-bold hover:border-ink",
                      "has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-paper has-[:focus-visible]:outline has-[:focus-visible]:outline-2",
                    )}>
                      <input type="radio" name={`points-${i}`} value={n} defaultChecked={initial.points[i] === n} className="sr-only" />
                      {n}
                    </label>
                  ))}
                </div>
              )}
              <label className="mt-3 block text-xs font-bold text-muted" htmlFor={`note-${i}`}>
                {c.mcq ? (changed ? "Reason for changing the automatic mark (required)" : "Note (needed only if you change the mark)") : "Note (optional)"}
              </label>
              <textarea id={`note-${i}`} name={`note-${i}`} defaultValue={initial.notes[i] ?? ""} maxLength={REVIEW_LIMITS.note} rows={c.mcq ? 1 : 2}
                required={changed}
                className="mt-1 w-full rounded-md border-2 border-line/40 bg-white p-2 text-sm focus:border-ink" />
              {errors[i] && <p role="alert" className="mt-1 text-xs font-semibold text-error">{errors[i]}</p>}
            </fieldset>
          </div>
        );
      })}

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

/** One area's suggestion: the points, why, the candidate's own supporting lines and what's missing. */
function AiHint({ s, onUse }: { s: Suggestion; onUse: () => void }) {
  return (
    <div className="mt-3 rounded-md border border-[#c9d6f2] bg-[#f3f6fd] p-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p><span className="font-bold text-ink">AI suggests {s.points} / {s.max}</span>{s.reasoning && <span className="text-muted"> · {s.reasoning}</span>}</p>
        <button type="button" onClick={onUse} className="rounded border border-ink/40 bg-white px-2 py-1 font-bold hover:bg-ink hover:text-paper">Use {s.points}</button>
      </div>
      {s.evidence.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {s.evidence.map((e) => <li key={e} className="border-l-2 border-[#7d97d6] pl-2 italic text-ink">“{e}”</li>)}
        </ul>
      )}
      {s.missing.length > 0 && <p className="mt-2 text-muted"><span className="font-semibold text-ink">Missing: </span>{s.missing.join("; ")}</p>}
    </div>
  );
}
