"use client";

import clsx from "clsx";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

const EASE = [0.2, 0.7, 0.3, 1] as const;

/**
 * Build steps, walked one at a time. The rail fills as the learner moves on,
 * finished steps turn into ticks, and the text slides in the direction of travel.
 */
export function BuildSteps({ steps }: { steps: string[] }) {
  const [[active, direction], setState] = useState<[number, 1 | -1]>([0, 1]);
  const reduced = useReducedMotion();
  const last = steps.length - 1;

  function go(to: number) {
    const target = Math.max(0, Math.min(last, to));
    if (target !== active) setState([target, target > active ? 1 : -1]);
  }

  const shift = reduced ? 0 : 24;

  return (
    <div className="flex flex-1 flex-col">
      <ol className="relative flex items-center justify-between" aria-label="Build steps">
        {/* The rail runs from the first circle's centre to the last one's. */}
        <span aria-hidden="true" className="absolute inset-x-4 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-line/25" />
        <motion.span
          aria-hidden="true"
          className="absolute inset-x-4 top-1/2 h-0.5 origin-left -translate-y-1/2 rounded-full bg-red-strong"
          initial={false}
          animate={{ scaleX: last ? active / last : 0 }}
          transition={{ duration: reduced ? 0 : 0.45, ease: EASE }}
        />

        {steps.map((_, i) => {
          const isActive = i === active;
          const isDone = i < active;
          return (
            <li key={i} className="relative">
              <motion.button
                type="button"
                onClick={() => go(i)}
                aria-current={isActive ? "step" : undefined}
                initial={false}
                animate={{ scale: isActive && !reduced ? 1.12 : 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
                className={clsx(
                  "grid size-8 place-items-center rounded-full text-xs font-bold transition-colors duration-300",
                  isActive && "bg-red-strong text-white ring-4 ring-red/15",
                  isDone && "bg-red-strong text-white",
                  !isActive && !isDone && "border border-line/40 bg-card text-muted hover:border-ink hover:text-ink",
                )}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={isDone ? "done" : "num"}
                    initial={reduced ? false : { opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.15 }}
                  >
                    {isDone ? <Check aria-hidden="true" className="size-3.5" strokeWidth={3} /> : i + 1}
                  </motion.span>
                </AnimatePresence>
                <span className="sr-only">Step {i + 1}{isDone ? " (done)" : ""}</span>
              </motion.button>
            </li>
          );
        })}
      </ol>

      <div className="relative mt-7 mb-6 overflow-hidden">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={active}
            custom={direction}
            variants={{
              enter: (d: number) => ({ opacity: 0, x: d * shift }),
              center: { opacity: 1, x: 0 },
              // `custom` on AnimatePresence hands the exiting step the new direction.
              exit: (d: number) => ({ opacity: 0, x: d * -shift }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: reduced ? 0 : 0.25, ease: EASE }}
            aria-live="polite"
          >
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-red-deep">
              Step {active + 1} <span className="text-muted">of {steps.length}</span>
            </p>
            <p
              className="mt-2 text-[15px] leading-relaxed text-ink/85 [&_code]:rounded [&_code]:bg-surface [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.85em]"
              dangerouslySetInnerHTML={{ __html: steps[active] }}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line/20 pt-5">
        <button
          type="button" onClick={() => go(active - 1)} disabled={active === 0}
          className="group inline-flex items-center gap-1 py-2 text-sm font-semibold text-muted transition-colors hover:text-ink disabled:opacity-40 disabled:hover:text-muted"
        >
          <ChevronLeft aria-hidden="true" className="size-4 transition-transform group-hover:-translate-x-0.5 group-disabled:translate-x-0" /> Back
        </button>
        <button
          type="button" onClick={() => go(active + 1)} disabled={active === last}
          className="group inline-flex items-center gap-1 rounded-md bg-red-strong px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-[background-color,transform] hover:bg-red-press active:translate-y-px disabled:opacity-40 disabled:hover:bg-red-strong"
        >
          {active === last ? "All steps done" : "Next"}
          {active !== last && <ChevronRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />}
        </button>
      </div>
    </div>
  );
}
