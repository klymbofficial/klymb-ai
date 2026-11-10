import { Appear } from "@/components/motion/Appear";
import type { Program } from "@/data/catalog";
import { ProgramCard } from "./ProgramCard";

export function ProgramGrid({ list }: { list: Program[] }) {
  return (
    <ul className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {list.map((p, i) => (
        <li key={p.slug}>
          <Appear delay={(i % 3) * 0.06} className="h-full"><ProgramCard program={p} /></Appear>
        </li>
      ))}
    </ul>
  );
}

/**
 * Programs split by whether you can take them: what is open first, then what
 * is listed but not built. The not-available half is left out when empty, and
 * the open half says so plainly when nothing in this view is open.
 */
export function ProgramGroups({ list, emptyOpen }: { list: Program[]; emptyOpen?: React.ReactNode }) {
  const open = list.filter((p) => p.status === "available");
  const closed = list.filter((p) => p.status === "unavailable");
  return (
    <div className="space-y-14">
      <section aria-labelledby="open-title">
        <h2 id="open-title" className="display text-[clamp(1.5rem,3vw,2rem)]">
          Open for enrolment <span className="text-muted nums">({open.length})</span>
        </h2>
        {open.length ? (
          <ProgramGrid list={open} />
        ) : (
          <p className="mt-4 max-w-2xl rounded-card bg-surface/70 px-5 py-4 text-[15px] leading-relaxed text-muted">{emptyOpen ?? "Nothing in this view is open for enrolment."}</p>
        )}
      </section>
      {closed.length > 0 && (
        <section aria-labelledby="closed-title">
          <h2 id="closed-title" className="display text-[clamp(1.5rem,3vw,2rem)]">
            Not available <span className="text-muted nums">({closed.length})</span>
          </h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
            These are listed so you can find them, but there is no course behind them yet: nothing to enrol in and no lessons or trial sessions to try. Open one to see how to ask us about it.
          </p>
          <ProgramGrid list={closed} />
        </section>
      )}
    </div>
  );
}
