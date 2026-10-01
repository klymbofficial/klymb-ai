"use client";

import clsx from "clsx";
import { useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";

const pains = [
  "Your job title is one that AI tools are starting to absorb",
  "You use ChatGPT for emails and summaries, but have never used AI on real work",
  "Interviews now ask about AI, and you don't have a story to tell",
  "You have experience, but nothing you can show a hiring manager",
  "You keep starting online courses and never finish them",
  "You want to move into a role where AI makes you more valuable, not less",
];

/**
 * The reader checks the lines that sound like them. Two or more, and the
 * section answers back: the qualifying moment that self-selection pages use.
 */
export function ForYouIf() {
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const toggle = (i: number) =>
    setPicked((s) => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <section aria-labelledby="for-you-title" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:items-start">
        <div className="lg:sticky lg:top-28">
          <Eyebrow>Is this for you?</Eyebrow>
          <h2 id="for-you-title" className="display mt-3 text-[clamp(1.75rem,3.6vw,2.6rem)] text-balance">
            Tick what sounds like you.
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">Be honest. Nobody sees this but you.</p>
          <div aria-live="polite" className="mt-8 min-h-28">
            {picked.size >= 2 ? (
              <div className="rounded-card bg-ink p-6 text-paper">
                <p className="text-lg font-extrabold">{picked.size} of 6. That is exactly what the 30 days fix.</p>
                <p className="mt-1 text-sm text-white/70">One role, one real problem a day, and work you can show.</p>
                <ButtonLink href="/tracks" variant="inverse" soft arrow className="mt-5 px-5 py-2.5 text-sm">Find your track</ButtonLink>
              </div>
            ) : (
              <p className="text-sm text-muted">{picked.size === 1 ? "One so far. Any others?" : "Two or more, and we should talk."}</p>
            )}
          </div>
        </div>

        <ul className="grid gap-3">
          {pains.map((p, i) => {
            const on = picked.has(i);
            return (
              <li key={p}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => toggle(i)}
                  className={clsx(
                    "flex w-full items-start gap-4 rounded-card border p-5 text-left transition-[background-color,border-color,transform] duration-200 active:scale-[0.99]",
                    on ? "border-red-strong bg-red-tint" : "border-line/30 bg-card hover:border-ink/40",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={clsx(
                      "mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border-2 transition-colors",
                      on ? "border-red-strong bg-red-strong text-white" : "border-line",
                    )}
                  >
                    {on && (
                      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="3.2"><path d="m5 12 5 5L19 7" /></svg>
                    )}
                  </span>
                  <span className="text-[15px] font-semibold leading-snug">{p}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
