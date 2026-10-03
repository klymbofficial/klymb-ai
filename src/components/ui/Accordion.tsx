"use client";

import clsx from "clsx";
import { useId, useState } from "react";

export interface AccordionItem {
  question: string;
  answer: string;
}

/**
 * Animated accordion: one panel open at a time, height animated.
 * Adapted from the "FAQ Accordion" pattern in Vengeance UI (MIT), rebuilt on
 * CSS (grid-rows transition) with real button semantics; reduced motion is
 * handled by the global rule in globals.css.
 */
export function Accordion({ items, variant = "rule" }: { items: AccordionItem[]; variant?: "rule" | "card" }) {
  const [open, setOpen] = useState<number | null>(0);
  const card = variant === "card";
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
                <span
                  aria-hidden="true"
                  className={clsx("transition-transform duration-250 ease-[cubic-bezier(0.2,0.7,0.3,1)]", isOpen && "rotate-45",
                    card
                      ? "grid size-7 shrink-0 place-items-center rounded-full bg-surface text-lg leading-none font-black text-ink"
                      : "shrink-0 text-2xl leading-none font-black text-red",
                  )}
                >
                  +
                </span>
              </button>
            </h3>
            <div
              id={`${base}-p-${i}`}
              role="region"
              aria-labelledby={`${base}-t-${i}`}
              hidden={!isOpen}
              className="grid grid-rows-[1fr] transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.2,0.7,0.3,1)] starting:grid-rows-[0fr] starting:opacity-0"
            >
              <div className="overflow-hidden">
                <p className={`pb-5 text-muted ${card ? "text-sm leading-relaxed" : ""}`}>{item.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
