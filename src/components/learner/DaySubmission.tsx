"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { submitDay } from "@/app/(learn)/learn/actions";
import { Button } from "@/components/ui/Button";
import type { Submission } from "@/lib/learner/data";

export function DaySubmission({
  day, checklist, submission,
}: { day: number; checklist?: string[]; submission: Submission | null }) {
  const [saved, setSaved] = useState(!!submission);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [checked, setChecked] = useState<boolean[]>(() => (checklist ?? []).map(() => false));
  const reduced = useReducedMotion();

  async function onSubmit(formData: FormData) {
    setError("");
    setPending(true);
    const result = await submitDay(day, formData);
    setPending(false);
    if (result.ok) setSaved(true);
    else setError(result.message);
  }

  return (
    <div>
      {checklist && (
        <fieldset className="mb-6">
          <legend className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">Before you submit</legend>
          <ul className="mt-3 space-y-2">
            {checklist.map((c, i) => (
              <li key={c} className="flex items-start gap-3">
                <input
                  id={`check-${day}-${i}`} type="checkbox" className="mt-1 size-4 accent-red-strong"
                  checked={checked[i]}
                  onChange={(e) => setChecked((prev) => prev.map((v, j) => (j === i ? e.target.checked : v)))}
                />
                <label htmlFor={`check-${day}-${i}`} className="text-sm">{c}</label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      <form action={onSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor={`url-${day}`} className="block text-sm font-bold">Link to your work</label>
          <input
            id={`url-${day}`} name="deliverable_url" type="url" inputMode="url" spellCheck={false}
            defaultValue={submission?.deliverable_url ?? ""}
            placeholder="https://github.com/you/pm-delivery-portfolio/…"
            className="mt-2 block w-full border-2 border-line bg-white px-3 py-3 focus:border-ink focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor={`note-${day}`} className="block text-sm font-bold">What you did, and why</label>
          <textarea
            id={`note-${day}`} name="note" rows={5} defaultValue={submission?.note ?? ""}
            placeholder="Your approach, the call you made, and what you would change…"
            className="mt-2 block w-full border-2 border-line bg-white p-3 focus:border-ink focus:outline-none"
          />
        </div>

        {error && <p role="alert" className="border-2 border-red-deep bg-red-tint p-3 text-sm font-semibold text-red-deep">{error}</p>}

        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" disabled={pending} aria-busy={pending}>
            {pending ? "Saving…" : submission ? "Update submission" : `Submit Day ${day}`}
          </Button>
          <AnimatePresence>
            {saved && !pending && (
              <motion.p
                role="status"
                initial={reduced ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="text-sm font-bold text-red-deep"
              >
                Saved. You can update it any time.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </form>

      {submission?.reviewer_note && (
        <div className="mt-6 border-l-2 border-red-strong bg-red-tint p-4">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-red-deep">Reviewer feedback</p>
          <p className="mt-1 text-sm">{submission.reviewer_note}</p>
        </div>
      )}
    </div>
  );
}
