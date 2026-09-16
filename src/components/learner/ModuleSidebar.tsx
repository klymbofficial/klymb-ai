import clsx from "clsx";
import Link from "next/link";
import { pmCurriculum, pmModules } from "@/data/pm-curriculum";

/** Module → day navigation, with the learner's progress marked. */
export function ModuleSidebar({ currentDay, submitted }: { currentDay: number; submitted: number[] }) {
  const done = new Set(submitted);
  const current = pmCurriculum.find((d) => d.day === currentDay);

  return (
    <nav aria-label="Course modules" className="border-2 border-line bg-paper">
      <div className="border-b-2 border-line px-5 py-4">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">Modules</p>
        <p className="mt-1 text-sm font-bold">
          Week {current?.week} · {pmModules.find((m) => m.week === current?.week)?.name}
        </p>
        <p className="display mt-2 text-3xl">Day {currentDay}</p>
      </div>

      <div className="max-h-[70vh] overflow-y-auto">
        {pmModules.map((module) => (
          <section key={module.week}>
            <h2 className="sticky top-0 bg-paper px-5 pt-4 pb-2">
              <span className="block text-[10px] font-extrabold uppercase tracking-[0.16em] text-red-deep">Week {module.week}</span>
              <span className="block text-sm font-bold">{module.name}</span>
            </h2>
            <ul className="pb-2">
              {pmCurriculum.filter((d) => d.week === module.week).map((d) => {
                const isCurrent = d.day === currentDay;
                return (
                  <li key={d.day}>
                    <Link
                      href={`/learn/day/${d.day}`}
                      aria-current={isCurrent ? "page" : undefined}
                      className={clsx(
                        "flex items-baseline gap-2 px-5 py-2 text-sm transition-colors",
                        isCurrent ? "bg-surface font-bold" : "hover:bg-surface/60",
                      )}
                    >
                      <span className={clsx("w-14 shrink-0 font-bold", done.has(d.day) ? "text-red-deep" : "text-muted")}>
                        Day {d.day}
                      </span>
                      <span className={clsx("min-w-0 flex-1 truncate", isCurrent ? "text-ink" : "text-muted")}>{d.title}</span>
                      {done.has(d.day) && <span aria-label="submitted" className="shrink-0 text-red-deep">✓</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </nav>
  );
}
