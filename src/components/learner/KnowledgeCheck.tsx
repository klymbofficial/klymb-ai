"use client";

import { useState } from "react";
import { submitDay } from "@/app/(learn)/learn/actions";
import { track } from "@/lib/analytics";
import { Button } from "@/components/ui/Button";

/**
 * Questions answerable only by someone who did the work. Answers are stored
 * with the day's submission for the reviewer: nothing is auto-graded, because
 * a marking script cannot tell a good judgement call from a plausible sentence.
 */
export function KnowledgeCheck({
  day, questions, saved,
}: { day: number; questions: string[]; saved: string[] | null }) {
  const [answers, setAnswers] = useState<string[]>(() => questions.map((_, i) => saved?.[i] ?? ""));
  const [status, setStatus] = useState<"idle" | "saving" | "saved">(saved?.length ? "saved" : "idle");
  const [error, setError] = useState("");

  async function onSubmit(formData: FormData) {
    setError("");
    setStatus("saving");
    formData.set("quiz", JSON.stringify(answers));
    const result = await submitDay(day, formData);
    if (result.ok) {
      setStatus("saved");
      track("knowledge_check_submit", { day, answered });
    }
    else {
      setStatus("idle");
      setError(result.message);
    }
  }

  const answered = answers.filter((a) => a.trim().length > 2).length;

  return (
    <form action={onSubmit} className="flex flex-1 flex-col gap-6">
      <p className="text-sm leading-relaxed text-muted">
        Answer these in order — they prove you actually did the work. Your reviewer reads them alongside your deliverable.
      </p>

      <ol className="flex flex-col gap-5">
        {questions.map((q, i) => (
          <li key={q}>
            <label htmlFor={`q-${day}-${i}`} className="block text-[15px] leading-snug font-semibold">
              <span className="text-red-deep">Q{i + 1}.</span> {q}
            </label>
            <input
              id={`q-${day}-${i}`}
              type="text"
              value={answers[i]}
              onChange={(e) => {
                const next = [...answers];
                next[i] = e.target.value;
                setAnswers(next);
                setStatus("idle");
              }}
              placeholder="Type your answer..."
              className="mt-2 block w-full rounded-md border border-line/40 bg-card px-3 py-2.5 text-sm transition-[border-color,box-shadow] duration-200 placeholder:text-muted/70 hover:border-line/70 focus:border-ink/60 focus:ring-4 focus:ring-ink/5 focus:outline-none"
            />
          </li>
        ))}
      </ol>

      {error && <p role="alert" className="border-2 border-error bg-error-tint p-3 text-sm font-semibold text-error">{error}</p>}

      <div className="mt-auto flex flex-wrap items-center gap-4">
        <Button type="submit" className="rounded-md px-4! py-2! text-xs!" disabled={status === "saving" || answered === 0} aria-busy={status === "saving"}>
          {status === "saving" ? "Saving…" : "Submit answers"}
        </Button>
        <p role="status" aria-live="polite" className="text-sm text-muted">
          {status === "saved" ? "Saved: you can change these any time." : `${answered} of ${questions.length} answered`}
        </p>
      </div>
    </form>
  );
}
