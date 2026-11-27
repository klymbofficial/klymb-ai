import { DueCell, dayLabel } from "@/components/company/ProgressTable";
import { REQUIREMENT_LABEL, dueState } from "@/lib/company/assign-rules";
import type { AssignmentSummary } from "@/lib/company/assign-data";
import type { MemberProgress } from "@/lib/company/progress-data";

const h2 = "text-xs font-extrabold uppercase tracking-[0.14em] text-muted";

/** People with a required course that is overdue or due within a week, who haven't passed every lesson. Nothing when there are none. */
export function NeedsAttention({ rows, total }: { rows: MemberProgress[]; total: number }) {
  const due = rows
    .filter((p) => p.assigned && p.requirement === "required" && p.dueOn)
    .map((p) => ({ p, state: dueState(p.dueOn, p.lessonsPassed >= total) }))
    .filter((x) => x.state === "overdue" || x.state === "soon")
    .sort((a, b) => (a.p.dueOn! < b.p.dueOn! ? -1 : 1));
  if (!due.length) return null;
  return (
    <section aria-labelledby="attention" className="border-l-4 border-error pl-4">
      <h2 id="attention" className={h2}>Needs attention</h2>
      <ul className="mt-3 divide-y divide-line/20">
        {due.map(({ p }) => (
          <li key={p.email} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2 text-sm">
            <span className="font-semibold">{p.name ?? p.email}</span>
            <span className="flex gap-4">
              <DueCell p={p} total={total} />
              <span className="tabular-nums text-muted">{p.lessonsPassed} of {total} lessons</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Recent assignments, newest first: what, to whom, by whom, and the people each one reached when it was confirmed. */
export function AssignmentHistory({ list }: { list: AssignmentSummary[] }) {
  if (!list.length) return null;
  return (
    <section aria-labelledby="history">
      <h2 id="history" className={h2}>Recent assignments</h2>
      <ul className="mt-3 border-b border-line/20">
        {list.map((a) => {
          const live = a.recipients.filter((r) => r.live).length;
          return (
            <li key={a.id} className="grid gap-x-6 gap-y-1 border-t border-line/20 py-3 text-sm sm:grid-cols-[6rem_minmax(0,1fr)_auto]">
              <span className="text-muted">{dayLabel(a.createdAt.slice(0, 10))}</span>
              <div className="min-w-0">
                <p className="font-semibold">{a.label}</p>
                <p className="break-words text-xs text-muted">
                  System Design · {REQUIREMENT_LABEL[a.requirement]}{a.dueOn ? `, due ${dayLabel(a.dueOn)}` : ""} · by {a.createdBy}
                </p>
              </div>
              <details className="text-sm sm:text-right">
                <summary className="cursor-pointer font-semibold underline-offset-4 hover:underline">
                  {live === a.recipients.length ? `${live} ${live === 1 ? "person" : "people"}` : `${live} of ${a.recipients.length} still assigned`}
                </summary>
                <ul className="mt-1 text-xs text-muted sm:text-right">
                  {a.recipients.map((r) => <li key={r.email} className="break-all">{r.email}{r.live ? "" : " (removed)"}</li>)}
                </ul>
              </details>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
