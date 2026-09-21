"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useState } from "react";

export interface AccordionItem {
  question: string;
  answer: string;
}

/**
 * Animated accordion: one panel open at a time, height animated.
 * Adapted from the "FAQ Accordion" pattern in Vengeance UI (MIT), rebuilt on
 * motion/react with real button semantics and reduced-motion support.
 */
export function Accordion({ items, variant = "rule" }: { items: AccordionItem[]; variant?: "rule" | "card" }) {
  const [open, setOpen] = useState<number | null>(0);
  const card = variant === "card";
  const reduced = useReducedMotion();
  const base = useId();

  return (
    <div className={card ? "flex flex-col gap-3" : "border-t-2 border-line"}>
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.question} className={card ? "card px-6" : "border-b-2 border-line"}>
            <h3>
              <button
                type="button"
                id={`${base}-t-${i}`}
                aria-expanded={isOpen}
                aria-controls={`${base}-p-${i}`}
                onClick={() => setOpen(isOpen ? null : i)}
                className={`flex w-full items-center justify-between gap-4 py-5 text-left font-extrabold ${card ? "text-base" : "text-lg"}`}
              >
                {item.question}
                <motion.span
                  aria-hidden="true"
                  animate={{ rotate: isOpen ? 45 : 0 }}
                  transition={reduced ? { duration: 0 } : { duration: 0.25, ease: [0.2, 0.7, 0.3, 1] }}
                  className={
                    card
                      ? "grid size-7 shrink-0 place-items-center rounded-full bg-red-strong text-lg leading-none font-black text-white"
                      : "shrink-0 text-2xl leading-none font-black text-red"
                  }
                >
                  +
                </motion.span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={`${base}-p-${i}`}
                  role="region"
                  aria-labelledby={`${base}-t-${i}`}
                  initial={reduced ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={reduced ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.2, 0.7, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <p className={`pb-5 text-muted ${card ? "text-sm leading-relaxed" : ""}`}>{item.answer}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
