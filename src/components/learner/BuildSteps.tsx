"use client";

import clsx from "clsx";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

/** Build steps, walked one at a time — the same shape as the day's task list. */
export function BuildSteps({ steps }: { steps: string[] }) {
  const [active, setActive] = useState(0);
  const reduced = useReducedMotion();

  return (
    <div>
      <ol className="flex items-center gap-1" aria-label="Build steps">
        {steps.map((_, i) => (
          <li key={i} className="flex flex-1 items-center gap-1">
            <button
              type="button"
              onClick={() => setActive(i)}
              aria-current={i === active ? "step" : undefined}
              className={clsx(
                "flex size-8 shrink-0 items-center justify-center border-2 text-xs font-extrabold transition-colors",
                i === active ? "border-red-strong bg-red-strong text-white" : i < active ? "border-ink bg-ink text-paper" : "border-line text-muted hover:border-ink",
              )}
            >
              {i + 1}
              <span className="sr-only">Step {i + 1}</span>
            </button>
            {i < steps.length - 1 && <span aria-hidden="true" className={clsx("h-0.5 flex-1", i < active ? "bg-ink" : "bg-line")} />}
          </li>
        ))}
      </ol>

      <div className="mt-5 border-2 border-line bg-surface/60 p-5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active}
            initial={reduced ? false : { opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduced ? { opacity: 1 } : { opacity: 0, x: -8 }}
            transition={{ duration: 0.2, ease: [0.2, 0.7, 0.3, 1] }}
          >
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">Step {active + 1} of {steps.length}</p>
            <p
              className="mt-2 text-lg [&_code]:bg-paper [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.85em]"
              dangerouslySetInnerHTML={{ __html: steps[active] }}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-4 flex justify-between gap-3">
        <button
          type="button" onClick={() => setActive((i) => Math.max(0, i - 1))} disabled={active === 0}
          className="border-2 border-line px-4 py-2 text-sm font-bold uppercase tracking-wider disabled:opacity-40"
        >
          ← Back
        </button>
        <button
          type="button" onClick={() => setActive((i) => Math.min(steps.length - 1, i + 1))} disabled={active === steps.length - 1}
          className="border-2 border-ink bg-ink px-4 py-2 text-sm font-bold uppercase tracking-wider text-paper disabled:opacity-40"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
