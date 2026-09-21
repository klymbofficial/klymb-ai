"use client";

import clsx from "clsx";
import { useState } from "react";
import { howItWorks, sectionCopy } from "@/data/program";
import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";

/**
 * A descending staircase of steps. Each step is indented one --step further
 * than the one above it, and an L-shaped dashed rule joins the two markers.
 * On small screens --step is 0, which collapses the L into a plain vertical
 * line and the staircase into an ordinary list.
 */
export function HowItWorks() {
  const [active, setActive] = useState(0);

  return (
    <section id="how-it-works" aria-labelledby="how-title" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="card rounded-slab p-8 sm:p-12 lg:p-16">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr] lg:items-center">
          <ol className="flex flex-col gap-6 [--step:0px] sm:[--step:2.75rem]">
            {howItWorks.map((step, i) => {
              const isActive = i === active;
              return (
                <li
                  key={step.title}
                  className="relative"
                  style={{ marginLeft: `calc(var(--step) * ${i})` }}
                >
                  {i > 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute -top-6 h-12 rounded-bl-xl border-b-2 border-l-2 border-dashed border-line/45"
                      style={{ left: "calc(23px - var(--step))", width: "var(--step)" }}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setActive(i)}
                    aria-current={isActive ? "step" : undefined}
                    className="group flex w-full items-start gap-5 rounded-card p-2 text-left transition-colors hover:bg-surface/50"
                  >
                    <span
                      className={clsx(
                        "grid size-12 shrink-0 place-items-center rounded-full text-lg font-extrabold transition-colors",
                        isActive ? "bg-red-strong text-white" : "bg-surface text-ink/70 group-hover:bg-surface",
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className={clsx("min-w-0 pt-1 transition-opacity", isActive ? "opacity-100" : "opacity-45")}>
                      <span className="block text-lg font-extrabold">{step.title}</span>
                      <span className="mt-1 block text-sm text-muted">{step.body}</span>
                    </span>
                  </button>
                  {isActive && i === 0 && (
                    <div className="mt-3 pl-[4.25rem]">
                      <ButtonLink href="/tracks" soft arrow className="px-4 py-2 text-xs">Choose Track</ButtonLink>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>

          <div className="lg:text-right">
            <Eyebrow>{sectionCopy.howItWorks.eyebrow}</Eyebrow>
            <h2 id="how-title" className="display mt-4 text-[clamp(2rem,4.5vw,3.25rem)] text-balance">
              {sectionCopy.howItWorks.title}
            </h2>
          </div>
        </div>
      </div>
    </section>
  );
}
