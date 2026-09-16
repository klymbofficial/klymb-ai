"use client";

import { useState } from "react";
import { submitDay } from "@/app/(learn)/learn/actions";
import { Button } from "@/components/ui/Button";

/**
 * Questions answerable only by someone who did the work. Answers are stored
 * with the day's submission for the reviewer — nothing is auto-graded, because
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
    if (result.ok) setStatus("saved");
    else {
      setStatus("idle");
      setError(result.message);
    }
  }

  const answered = answers.filter((a) => a.trim().length > 2).length;

  return (
    <form action={onSubmit} className="flex flex-col gap-5">
      <p className="text-sm text-muted">
        Answer these in order — they prove you actually did the work. Your reviewer reads them alongside your deliverable.
      </p>

      <ol className="flex flex-col gap-5">
        {questions.map((q, i) => (
          <li key={q}>
            <label htmlFor={`q-${day}-${i}`} className="block text-sm font-bold">
              Q{i + 1}) {q}
            </label>
            <textarea
              id={`q-${day}-${i}`}
              rows={2}
              value={answers[i]}
              onChange={(e) => {
                const next = [...answers];
                next[i] = e.target.value;
                setAnswers(next);
                setStatus("idle");
              }}
              placeholder="Type your answer…"
              className="mt-2 block w-full border-2 border-line bg-white p-3 focus:border-ink focus:outline-none"
            />
          </li>
        ))}
      </ol>

      {error && <p role="alert" className="border-2 border-red-deep bg-red-tint p-3 text-sm font-semibold text-red-deep">{error}</p>}

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={status === "saving" || answered === 0} aria-busy={status === "saving"}>
          {status === "saving" ? "Saving…" : "Submit answers"}
        </Button>
        <p role="status" aria-live="polite" className="text-sm font-semibold text-muted">
          {status === "saved" ? "Saved — you can change these any time." : `${answered} of ${questions.length} answered`}
        </p>
      </div>
    </form>
  );
}
