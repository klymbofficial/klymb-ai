import type { MemberProgress } from "@/lib/company/progress-data";
import { statusLabel } from "@/lib/company/progress-summary";

/**
 * One plain phrase for where someone is, from what the server recorded. The
 * wording and the rules live in progress-summary.ts, so this table and the
 * summary counts always agree. A person with failed attempts and no lessons
 * passed has recorded activity: they are not "not started".
 */
export function statusOf(p: MemberProgress, total: number): string {
  return statusLabel(p, total);
}

/** The server stores timestamps; the date shown is India's, like the course. */
const DATE = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

export function lastActiveOf(p: MemberProgress) {
  return p.lastActive ? DATE.format(new Date(p.lastActive)) : "–";
}

const th = "px-3 py-2 text-left text-xs font-extrabold uppercase tracking-[0.12em] text-muted";

/** System Design activity for the people the viewer may see. No totals that Klymb doesn't hold. */
export function ProgressTable({
  rows, total, showTeam, renderAction, actionLabel,
}: {
  rows: MemberProgress[];
  total: number;
  showTeam: boolean;
  /** HR's Assign / Remove button for a row. Omitted for everyone else, who only read. */
  renderAction?: (p: MemberProgress) => React.ReactNode;
  actionLabel?: string;
}) {
  return (
    <>
      <div className="card hidden overflow-x-auto lg:block">
      <table className="w-full min-w-[40rem] text-sm">
        <caption className="sr-only">System Design activity by person</caption>
        <thead>
          <tr className="border-b border-line/25">
            <th scope="col" className={th}>Person</th>
            {showTeam && <th scope="col" className={th}>Team</th>}
            <th scope="col" className={th}>Status</th>
            <th scope="col" className={th}>Lessons passed</th>
            <th scope="col" className={th}>Final assessment</th>
            <th scope="col" className={th}>Last activity</th>
            {renderAction && <th scope="col" className={th}>{actionLabel}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.email} className="border-b border-line/15 last:border-0">
              <th scope="row" className="px-3 py-3 text-left font-normal">
                <div className="font-semibold">{p.name ?? p.email}</div>
                {p.name && <div className="text-xs text-muted">{p.email}</div>}
              </th>
              {showTeam && <td className="px-3 py-3 text-muted">{p.teamName ?? "No team"}</td>}
              <td className="px-3 py-3 font-semibold">{statusOf(p, total)}</td>
              <td className="px-3 py-3 tabular-nums">{p.hasAccess ? `${p.lessonsPassed} of ${total}` : "–"}</td>
              <td className="px-3 py-3 tabular-nums">
                {p.finalAttempts > 0 ? `${p.finalBest}% best, ${p.finalAttempts} ${p.finalAttempts === 1 ? "try" : "tries"}` : "Not taken"}
              </td>
              <td className="px-3 py-3 text-muted">{lastActiveOf(p)}</td>
              {renderAction && <td className="px-3 py-3">{renderAction(p)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      {/* Phones and tablets (under 1024px, where the table no longer fits): the same rows as one card per person, so nothing sits off-screen to the right.
          The values and the action are left-aligned: the floating help button sits at the right edge. The Assign /
          Remove button is the same renderAction as in the table, so it runs the same server action. */}
      <ul aria-label="System Design activity by person" className="grid gap-3 sm:grid-cols-2 lg:hidden">
        {rows.map((p) => (
          <li key={p.email} className="card p-4">
            <p className="font-semibold">{p.name ?? p.email}</p>
            {p.name && <p className="break-all text-xs text-muted">{p.email}</p>}
            <p className="mt-2 text-sm font-semibold">{statusOf(p, total)}</p>
            <dl className="mt-3 grid grid-cols-[8.5rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
              {showTeam && (<><dt className="text-muted">Team</dt><dd>{p.teamName ?? "No team"}</dd></>)}
              <dt className="text-muted">Lessons passed</dt>
              <dd className="tabular-nums">{p.hasAccess ? `${p.lessonsPassed} of ${total}` : "–"}</dd>
              <dt className="text-muted">Final assessment</dt>
              <dd className="tabular-nums">{p.finalAttempts > 0 ? `${p.finalBest}% best, ${p.finalAttempts} ${p.finalAttempts === 1 ? "try" : "tries"}` : "Not taken"}</dd>
              <dt className="text-muted">Last activity</dt>
              <dd className="text-muted">{lastActiveOf(p)}</dd>
            </dl>
            {renderAction && (
              <div className="mt-3 border-t border-line/15 pt-3 [&_button]:min-h-11 [&_button]:px-4 [&_button]:text-sm">{renderAction(p)}</div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
