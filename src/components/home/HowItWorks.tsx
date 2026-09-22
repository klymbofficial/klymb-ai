"use client";

import clsx from "clsx";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { howItWorks, sectionCopy } from "@/data/program";
import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";

const EASE = [0.2, 0.7, 0.3, 1] as const;
const STEP_MS = 2600;

/**
 * A descending staircase of steps. Each step is indented one --step further
 * than the one above it, and an L-shaped dashed rule joins the two markers.
 * On small screens --step is 0, which collapses the L into a plain vertical
 * line and the staircase into an ordinary list.
 *
 * Once it scrolls into view it walks itself from 1 to 6: completed steps tick
 * off, and the rule to each new step draws in red. Any click, hover or focus
 * hands control to the reader and the walk stops for good.
 */
export function HowItWorks() {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const ref = useRef<HTMLOListElement>(null);
  const inView = useInView(ref, { margin: "-120px" });
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!auto || !inView || reduced) return;
    const id = setInterval(() => setActive((i) => (i + 1) % howItWorks.length), STEP_MS);
    return () => clearInterval(id);
  }, [auto, inView, reduced]);

  const takeOver = () => setAuto(false);

  return (
    <section id="how-it-works" aria-labelledby="how-title" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="card rounded-slab p-8 sm:p-12 lg:p-16">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr] lg:items-center">
          <ol
            ref={ref}
            onMouseEnter={takeOver}
            onFocus={takeOver}
            className="flex flex-col gap-6 [--step:0px] sm:[--step:2.75rem]"
          >
            {howItWorks.map((step, i) => {
              const isActive = i === active;
              const isDone = i < active;
              return (
                <motion.li
                  key={step.title}
                  className="relative"
                  style={{ marginLeft: `calc(var(--step) * ${i})` }}
                  initial={reduced ? false : { opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, delay: i * 0.09, ease: EASE }}
                >
                  {i > 0 && (
                    <>
                      <span
                        aria-hidden="true"
                        className="absolute -top-6 h-12 rounded-bl-xl border-b-2 border-l-2 border-dashed border-line/45"
                        style={{ left: "calc(23px - var(--step))", width: "var(--step)" }}
                      />
                      {/* The same L in solid red, revealed top-left to bottom-right so it reads as drawn. */}
                      <motion.span
                        aria-hidden="true"
                        className="absolute -top-6 h-12 rounded-bl-xl border-b-2 border-l-2 border-red-strong"
                        style={{ left: "calc(23px - var(--step))", width: "var(--step)" }}
                        initial={false}
                        animate={{ clipPath: i <= active ? "inset(0% 0% 0% 0%)" : "inset(0% 100% 100% 0%)" }}
                        transition={{ duration: reduced ? 0 : 0.55, ease: EASE }}
                      />
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => { takeOver(); setActive(i); }}
                    aria-current={isActive ? "step" : undefined}
                    className="group flex w-full items-start gap-5 rounded-card p-2 text-left transition-colors hover:bg-surface/50"
                  >
                    <span className="relative grid size-12 shrink-0 place-items-center">
                      {isActive && !reduced && (
                        <motion.span
                          key={`pulse-${active}`}
                          aria-hidden="true"
                          className="absolute inset-0 rounded-full bg-red-strong"
                          initial={{ scale: 1, opacity: 0.45 }}
                          animate={{ scale: 1.7, opacity: 0 }}
                          transition={{ duration: 1.1, ease: "easeOut" }}
                        />
                      )}
                      <motion.span
                        className={clsx(
                          "relative grid size-12 place-items-center rounded-full text-lg font-extrabold transition-colors duration-300",
                          isActive ? "bg-red-strong text-white" : isDone ? "bg-ink text-paper" : "bg-surface text-ink/70",
                        )}
                        animate={{ scale: isActive ? 1.08 : 1 }}
                        transition={{ type: "spring", stiffness: 420, damping: 22 }}
                      >
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.span
                            key={isDone ? "done" : "num"}
                            initial={reduced ? false : { opacity: 0, scale: 0.6 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.6 }}
                            transition={{ duration: 0.18 }}
                          >
                            {isDone ? "✓" : i + 1}
                          </motion.span>
                        </AnimatePresence>
                      </motion.span>
                    </span>

                    <motion.span
                      className="min-w-0 pt-1"
                      animate={{ opacity: isActive ? 1 : isDone ? 0.7 : 0.45, x: isActive ? 4 : 0 }}
                      transition={{ duration: 0.35, ease: EASE }}
                    >
                      <span className="block text-lg font-extrabold">{step.title}</span>
                      <span className="mt-1 block text-sm text-muted">{step.body}</span>
                    </motion.span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isActive && i === 0 && (
                      <motion.div
                        className="overflow-hidden pl-[4.25rem]"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: EASE }}
                      >
                        <div className="pt-3">
                          <ButtonLink href="/tracks" soft arrow className="px-4 py-2 text-xs">Choose Track</ButtonLink>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.li>
              );
            })}
          </ol>

          <motion.div
            className="lg:text-right"
            initial={reduced ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: 0.2, ease: EASE }}
          >
            <Eyebrow>{sectionCopy.howItWorks.eyebrow}</Eyebrow>
            <h2 id="how-title" className="display mt-4 text-[clamp(2rem,4.5vw,3.25rem)] text-balance">
              {sectionCopy.howItWorks.title}
            </h2>
            {/* Progress through the walk, so the auto-advance is legible rather than mysterious. */}
            <div aria-hidden="true" className="mt-6 flex gap-1.5 lg:justify-end">
              {howItWorks.map((_, i) => (
                <span key={i} className="h-1.5 w-8 overflow-hidden rounded-full bg-surface">
                  <motion.span
                    className="block h-full rounded-full bg-red-strong"
                    initial={false}
                    animate={{ width: i <= active ? "100%" : "0%" }}
                    transition={{ duration: reduced ? 0 : 0.4, ease: EASE }}
                  />
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
