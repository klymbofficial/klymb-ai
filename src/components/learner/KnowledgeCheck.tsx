"use client";

import { useState } from "react";
import { MIN_ANSWER_CHARS } from "@/lib/learner/integrity";

/**
 * Questions answerable only by someone who did the work. The inputs belong to
 * the day's submission form (the HTML `form` attribute), so the answers and
 * the link are sent and checked together: a day can't be completed with one
 * and not the other. Stored for the reviewer, never auto-graded.
 */
export function KnowledgeCheck({
  day, questions, saved,
}: { day: number; questions: string[]; saved: string[] | null }) {
  const [answers, setAnswers] = useState<string[]>(() => questions.map((_, i) => saved?.[i] ?? ""));
  const answered = answers.filter((a) => a.trim().length >= MIN_ANSWER_CHARS).length;

  return (
    <div className="flex flex-1 flex-col gap-6">
      <p className="text-sm leading-relaxed text-muted">
        Answer every question in your own words, a full sentence or more. They&apos;re sent with your deliverable when you submit the day, and your reviewer reads them together.
      </p>

      <ol className="flex flex-col gap-5">
        {questions.map((q, i) => (
          <li key={q}>
            <label htmlFor={`q-${day}-${i}`} className="block text-[15px] leading-snug font-semibold">
              <span className="text-red-deep">Q{i + 1}.</span> {q}
            </label>
            <textarea
              id={`q-${day}-${i}`}
              name={`quiz_${i}`}
              form={`day-form-${day}`}
              rows={2}
              maxLength={2000}
              value={answers[i]}
              onChange={(e) => {
                const next = [...answers];
                next[i] = e.target.value;
                setAnswers(next);
              }}
              onPaste={(e) => e.preventDefault()}
              placeholder="Type your answer..."
              className="mt-2 block w-full rounded-md border border-line/40 bg-card px-3 py-2.5 text-sm transition-[border-color,box-shadow] duration-200 placeholder:text-muted/70 hover:border-line/70 focus:border-ink/60 focus:ring-4 focus:ring-ink/5 focus:outline-none"
            />
          </li>
        ))}
      </ol>

      <p role="status" aria-live="polite" className="mt-auto text-sm text-muted">
        {answered} of {questions.length} answered · submit them with your deliverable
      </p>
    </div>
  );
}
