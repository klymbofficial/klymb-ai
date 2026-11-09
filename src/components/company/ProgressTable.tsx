import type { MemberProgress } from "@/lib/company/progress-data";

/** One plain word for where someone is, from what the server recorded. */
export function statusOf(p: MemberProgress, total: number): string {
  if (!p.hasAccess) return "No access yet";
  if (p.lessonsPassed === 0 && p.finalAttempts === 0) return "Not started";
  if (p.lessonsPassed >= total) return p.finalAttempts > 0 ? "Final taken" : "All lessons passed";
  return "In progress";
}

/** The server stores timestamps; the date shown is India's, like the course. */
const DATE = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

export function lastActiveOf(p: MemberProgress) {
  return p.lastActive ? DATE.format(new Date(p.lastActive)) : "–";
}

const th = "px-3 py-2 text-left text-xs font-extrabold uppercase tracking-[0.12em] text-muted";

/** System Design activity for the people the viewer may see. No totals that Klymb doesn't hold. */
export function ProgressTable({ rows, total, showTeam }: { rows: MemberProgress[]; total: number; showTeam: boolean }) {
  return (
    <div className="card overflow-x-auto">
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
