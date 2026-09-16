import clsx from "clsx";
import { tracks } from "@/data/tracks";
import type { LearnerProgress } from "@/lib/admin/data";

const trackName = (slug: string) => tracks.find((t) => t.slug === slug)?.name ?? slug;

const bandLabel: Record<string, string> = {
  distinction: "Distinction",
  job_ready: "Job-ready",
  developing: "Developing",
  not_yet: "Not yet",
};

/** 30 ticks: filled = submitted. Assessment days are marked in red. */
function DayStrip({ done }: { done: number }) {
  return (
    <span className="flex gap-px" aria-hidden="true">
      {Array.from({ length: 30 }, (_, i) => {
        const day = i + 1;
        const isGate = day % 7 === 0 && day <= 28;
        return (
          <span
            key={day}
            className={clsx("h-4 w-1.5", day <= done ? (isGate ? "bg-red-strong" : "bg-ink") : "bg-line")}
          />
        );
      })}
    </span>
  );
}

export function ProgressTable({ rows }: { rows: LearnerProgress[] }) {
  return (
    <div className="overflow-x-auto border-2 border-line bg-paper">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="sticky top-0 z-10 bg-ink text-paper">
          <tr>
            {["Learner", "Track", "Progress", "Days", "Assessments", "Evidence", "Status"].map((h) => (
              <th key={h} scope="col" className="p-3 text-[11px] font-extrabold uppercase tracking-[0.1em]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((l, i) => (
            <tr key={l.id} className={clsx("border-t border-line align-middle", i % 2 && "bg-surface/60")}>
              <th scope="row" className="p-3 font-bold">
                {l.name}
                <span className="block text-xs font-normal text-muted">{l.email}</span>
              </th>
              <td className="p-3 text-xs">{trackName(l.track)}</td>
              <td className="p-3"><DayStrip done={l.days_submitted} /></td>
              <td className="p-3 nums font-extrabold">
                {l.days_submitted}<span className="text-muted">/30</span>
                {l.last_submission_at && (
                  <span className="block text-[11px] font-normal text-muted">
                    last {new Date(l.last_submission_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                  </span>
                )}
              </td>
              <td className="p-3 nums">
                {l.assessments_scored}<span className="text-muted">/4</span>
                {l.latest_band && (
                  <span className="mt-0.5 block text-[11px] font-bold text-red-deep">{bandLabel[l.latest_band] ?? l.latest_band}</span>
                )}
              </td>
              <td className="p-3 text-xs">
                <span className="flex gap-2">
                  {l.github_url
                    ? <a href={l.github_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-red-deep">GitHub</a>
                    : <span className="text-muted">No GitHub</span>}
                  {l.linkedin_url && <a href={l.linkedin_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-red-deep">LinkedIn</a>}
                </span>
              </td>
              <td className="p-3">
                <span className={clsx("border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider",
                  l.status === "active" ? "border-ink text-ink" : "border-muted text-muted")}>
                  {l.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
