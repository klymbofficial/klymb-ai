"use client";

import clsx from "clsx";
import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown } from "lucide-react";

export interface SidebarModule {
  week: number;
  name: string;
  days: { day: number; title: string }[];
}

/**
 * Week → day navigation. The current week opens; the others fold away, as in
 * the design. Only titles are passed in, so the curriculum stays on the server.
 */
export function ModuleSidebar({
  modules, currentDay, submitted,
}: { modules: SidebarModule[]; currentDay: number; submitted: number[] }) {
  const done = new Set(submitted);
  const currentWeek = modules.find((m) => m.days.some((d) => d.day === currentDay))?.week;
  const [open, setOpen] = useState<Set<number>>(() => new Set(currentWeek ? [currentWeek] : []));

  function toggle(week: number) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(week)) next.delete(week);
      else next.add(week);
      return next;
    });
  }

  return (
    <nav aria-label="Course modules" className="divide-y divide-line/25 border-y border-line/25">
      {modules.map((module) => {
        const isOpen = open.has(module.week);
        const isCurrentWeek = module.week === currentWeek;
        return (
          <section key={module.week} className="py-5">
            <h2>
              <button
                type="button"
                onClick={() => toggle(module.week)}
                aria-expanded={isOpen}
                aria-controls={`week-${module.week}`}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <span>
                  <span className={clsx("block font-sans text-sm font-bold uppercase tracking-[0.04em]", isCurrentWeek ? "text-red-deep" : "text-muted")}>
                    Week {module.week}
                  </span>
                  <span className="block font-sans text-base font-bold">{module.name}</span>
                </span>
                <ChevronDown aria-hidden="true" className={clsx("size-4 shrink-0 text-muted transition-transform duration-300", isOpen && "rotate-180")} />
              </button>
            </h2>

            <AnimatePresence initial={false}>
            {isOpen && (
              <motion.ul
                id={`week-${module.week}`}
                className="flex flex-col gap-1 overflow-hidden"
                initial={{ height: 0, opacity: 0, marginTop: 0 }}
                animate={{ height: "auto", opacity: 1, marginTop: 12 }}
                exit={{ height: 0, opacity: 0, marginTop: 0 }}
                transition={{ duration: 0.3, ease: [0.2, 0.7, 0.3, 1] }}
              >
                {module.days.map((d) => {
                  const isCurrent = d.day === currentDay;
                  const isDone = done.has(d.day);
                  return (
                    <li key={d.day}>
                      <Link
                        href={`/learn/day/${d.day}`}
                        aria-current={isCurrent ? "page" : undefined}
                        className={clsx(
                          "group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors duration-200",
                          isCurrent ? "bg-red-tint" : "hover:bg-card",
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={clsx(
                            "mt-1.5 grid size-4 shrink-0 place-items-center rounded-full",
                            isCurrent ? "bg-red-strong" : isDone ? "bg-ink text-paper" : "border-[1.5px] border-muted/70",
                          )}
                        >
                          {isDone && !isCurrent && <Check className="size-2.5" strokeWidth={3.5} />}
                        </span>
                        <span className="min-w-0 transition-transform duration-200 group-hover:translate-x-0.5">
                          <span className={clsx("block text-[15px] font-bold", isCurrent && "text-red-deep")}>
                            Day {d.day}
                            {isDone && <span className="sr-only"> (submitted)</span>}
                          </span>
                          <span className="block text-sm leading-snug text-ink/80">{d.title}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </motion.ul>
            )}
            </AnimatePresence>
          </section>
        );
      })}
    </nav>
  );
}
