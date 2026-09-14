"use client";

import clsx from "clsx";
import { useState } from "react";
import type { InterviewQuestion } from "@/types/program";

const levels = ["Not ready", "Shaky", "Okay", "Confident"];

export function InterviewPractice({ questions }: { questions: InterviewQuestion[] }) {
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const rated = Object.keys(ratings).length;

  return (
    <div>
      <p role="status" className="text-sm font-bold text-muted">Self-rated {rated} of {questions.length} (this preview only)</p>
      <ol className="mt-4 border-t-2 border-line">
        {questions.map((q, i) => (
          <li key={q.question} className="border-b-2 border-line py-6">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-red-deep">{q.category}</p>
            <p className="mt-1 text-xl font-extrabold">{i + 1}. {q.question}</p>
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-bold underline underline-offset-4">What a good answer covers</summary>
              <p className="mt-2 text-muted">{q.whatGoodLooksLike}</p>
            </details>
            <fieldset className="mt-4">
              <legend className="sr-only">Rate your readiness for question {i + 1}</legend>
              <div className="flex flex-wrap gap-2">
                {levels.map((label, level) => (
                  <label key={label} className={clsx("cursor-pointer border-2 px-3 py-1.5 text-sm font-bold has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-red",
                    ratings[i] === level ? "border-ink bg-ink text-paper" : "border-line hover:border-ink")}>
                    <input type="radio" name={`q-${i}`} className="sr-only" checked={ratings[i] === level} onChange={() => setRatings((r) => ({ ...r, [i]: level }))} />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          </li>
        ))}
      </ol>
    </div>
  );
}
