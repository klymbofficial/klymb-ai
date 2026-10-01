"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { submitDay } from "@/app/(learn)/learn/actions";
import { track } from "@/lib/analytics";
import { Button, ButtonLink } from "@/components/ui/Button";
import type { Submission } from "@/lib/learner/data";

export function DaySubmission({
  day, checklist, submission, needsLinkedinPost, nextDay,
}: { day: number; checklist?: string[]; submission: Submission | null; needsLinkedinPost?: boolean; nextDay?: number }) {
  const [saved, setSaved] = useState(!!submission);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [checked, setChecked] = useState<boolean[]>(() => (checklist ?? []).map(() => false));

  async function onSubmit(formData: FormData) {
    setError("");
    setPending(true);
    const result = await submitDay(day, formData);
    setPending(false);
    if (result.ok) {
      setSaved(true);
      track("day_submit", { day, updated: !!submission });
    }
    else setError(result.message);
  }

  return (
    <div className="flex flex-1 flex-col">
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

      <form action={onSubmit} className="flex flex-1 flex-col gap-5">
        <div>
          <label htmlFor={`url-${day}`} className="block text-[15px] font-semibold">Link to your work</label>
          <input
            id={`url-${day}`} name="deliverable_url" type="url" inputMode="url" spellCheck={false}
            defaultValue={submission?.deliverable_url ?? ""}
            placeholder="https://github.com/your-name/your-portfolio-repo/..."
            className="mt-2 block w-full rounded-md border border-line/40 bg-card px-3 py-2.5 text-sm transition-[border-color,box-shadow] duration-200 placeholder:text-muted/70 hover:border-line/70 focus:border-ink/60 focus:ring-4 focus:ring-ink/5 focus:outline-none"
          />
        </div>
        {needsLinkedinPost && (
          <div>
            <label htmlFor={`li-${day}`} className="block text-[15px] font-semibold">Your LinkedIn post</label>
            <p className="mt-1 text-xs text-muted">
              Post about a decision you made this week and what you would do differently. Open the post, choose
              “Copy link to post”, and paste it here. It must be from your own profile.
            </p>
            <input
              id={`li-${day}`} name="linkedin_post_url" type="url" inputMode="url" spellCheck={false}
              defaultValue={submission?.linkedin_post_url ?? ""}
              placeholder="https://www.linkedin.com/posts/yourname_…"
              className="mt-2 block w-full rounded-md border border-line/40 bg-card px-3 py-2.5 text-sm transition-[border-color,box-shadow] duration-200 placeholder:text-muted/70 hover:border-line/70 focus:border-ink/60 focus:ring-4 focus:ring-ink/5 focus:outline-none"
            />
          </div>
        )}
        <div>
          <label htmlFor={`note-${day}`} className="block text-[15px] font-semibold">What you did, and why</label>
          <textarea
            id={`note-${day}`} name="note" rows={3} defaultValue={submission?.note ?? ""}
            placeholder="Your approach, the call you made, and what you would change..."
            className="mt-2 block w-full rounded-md border border-line/40 bg-card px-3 py-2.5 text-sm transition-[border-color,box-shadow] duration-200 placeholder:text-muted/70 hover:border-line/70 focus:border-ink/60 focus:ring-4 focus:ring-ink/5 focus:outline-none"
          />
        </div>

        {error && <p role="alert" className="border-2 border-error bg-error-tint p-3 text-sm font-semibold text-error">{error}</p>}

        <div className="mt-auto flex flex-wrap items-center gap-4">
          <Button type="submit" className="rounded-md px-4! py-2! text-xs!" disabled={pending} aria-busy={pending}>
            {pending ? "Saving…" : submission ? "Update submission" : `Submit Day ${day}`}
          </Button>
          <AnimatePresence>
            {saved && !pending && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-wrap items-center gap-4"
              >
                <p role="status" className="text-sm font-bold text-red-deep">Saved. You can update it any time.</p>
                {nextDay && <ButtonLink href={`/learn/day/${nextDay}`} arrow>Start Day {nextDay}</ButtonLink>}
              </motion.div>
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
