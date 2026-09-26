"use client";

import clsx from "clsx";
import { AnimatePresence, animate, motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { howItWorks, sectionCopy } from "@/data/program";
import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";

const EASE = [0.2, 0.7, 0.3, 1] as const;

/**
 * A descending staircase of steps. Each step is indented one --step further
 * than the one above it, and an L-shaped dashed rule joins the two markers.
 * On small screens --step is 0, which collapses the L into a plain vertical
 * line and the staircase into an ordinary list.
 *
 * Scroll drives it. On large screens the card pins while the section scrolls
 * past, and the reader's position through that runway picks the step: tick
 * off, draw the rule, light the next. On small screens nothing pins; the
 * steps advance as the list itself moves up the screen.
 */
export function HowItWorks() {
  const [active, setActive] = useState(0);
  const [pinned, setPinned] = useState(false);
  const runway = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setPinned(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const { scrollYProgress } = useScroll({
    target: runway,
    offset: pinned ? ["start start", "end end"] : ["start 70%", "end 55%"],
  });

  const count = howItWorks.length;
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setActive(Math.min(count - 1, Math.max(0, Math.floor(v * count))));
  });

  /**
   * Clicking a step scrolls to where that step lives, so scroll and state
   * never disagree. The scroll is driven here rather than with
   * `behavior: "smooth"`: the step content changes height as it activates,
   * and the browser's own smooth scroll was being cancelled part-way by
   * that layout shift, leaving the wrong step lit.
   */
  const scrolling = useRef<ReturnType<typeof animate> | null>(null);
  function goTo(i: number) {
    const el = runway.current;
    if (!el || !pinned) return setActive(i);
    const top = el.getBoundingClientRect().top + window.scrollY;
    const travel = el.offsetHeight - window.innerHeight;
    const target = top + travel * ((i + 0.5) / count);
    scrolling.current?.stop();
    if (reduced) return window.scrollTo({ top: target, behavior: "instant" });
    scrolling.current = animate(window.scrollY, target, {
      duration: 0.7,
      ease: [0.2, 0.7, 0.3, 1],
      onUpdate: (y) => window.scrollTo({ top: y, behavior: "instant" }),
    });
  }

  return (
    <section id="how-it-works" aria-labelledby="how-title" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div ref={runway} className="[overflow-anchor:none] lg:h-[300vh]">
      <div className="card rounded-slab p-8 sm:p-12 lg:sticky lg:top-24 lg:p-14">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr] lg:items-center">
          <ol className="flex flex-col gap-6 [--step:0px] sm:[--step:2.75rem]">
            {howItWorks.map((step, i) => {
              const isActive = i === active;
              const isDone = i < active;
              return (
                <motion.li
                  key={step.title}
                  className="relative"
                  style={{ marginLeft: `calc(var(--step) * ${i})` }}
                  initial={{ opacity: 0, x: -16 }}
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
                    onClick={() => goTo(i)}
                    aria-current={isActive ? "step" : undefined}
                    className="group flex w-full items-start gap-5 rounded-card p-2 text-left transition-colors hover:bg-surface/50"
                  >
                    <span className="relative grid size-12 shrink-0 place-items-center">
                      {isActive && (
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
                            initial={{ opacity: 0, scale: 0.6 }}
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

                  {/* Space for the button is always reserved; only its opacity changes.
                      Collapsing it changed the page's height mid-scroll, and Chrome
                      cancels a smooth scroll when content above the target moves,
                      so /#pricing stopped a section short. */}
                  {i === 0 && (
                    <motion.div
                      className="pt-3 pl-[4.25rem]"
                      initial={false}
                      animate={{ opacity: isActive ? 1 : 0 }}
                      transition={{ duration: 0.25, ease: EASE }}
                      inert={!isActive}
                      aria-hidden={!isActive}
                    >
                      <ButtonLink href="/tracks" soft arrow className="px-4 py-2 text-xs">Choose Track</ButtonLink>
                    </motion.div>
                  )}
                </motion.li>
              );
            })}
          </ol>

          <motion.div
            className="lg:text-right"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: 0.2, ease: EASE }}
          >
            <Eyebrow>{sectionCopy.howItWorks.eyebrow}</Eyebrow>
            <h2 id="how-title" className="display mt-4 text-[clamp(2rem,4.5vw,3.25rem)] text-balance">
              {sectionCopy.howItWorks.title}
            </h2>
            {/* Fills continuously with scroll, so the reader can see how far is left. */}
            <div aria-hidden="true" className="mt-6 flex gap-1.5 lg:justify-end">
              {howItWorks.map((_, i) => (
                <Segment key={i} index={i} count={count} progress={scrollYProgress} />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
      </div>
    </section>
  );
}

function Segment({ index, count, progress }: { index: number; count: number; progress: MotionValue<number> }) {
  const fill = useTransform(progress, (v) => `${Math.min(1, Math.max(0, v * count - index)) * 100}%`);
  return (
    <span className="h-1.5 w-8 overflow-hidden rounded-full bg-surface">
      <motion.span className="block h-full rounded-full bg-red-strong" style={{ width: fill }} />
    </span>
  );
}
