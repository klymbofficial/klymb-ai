import { ButtonLink } from "@/components/ui/Button";
import { DueCell, lastActiveOf, statusOf } from "@/components/company/ProgressTable";
import { ProgressRing } from "@/components/company/OrgCharts";
import type { MemberProgress } from "@/lib/company/progress-data";

export function UpskillCourseCard({ person, total }: { person: MemberProgress; total: number }) {
  return (
    <section aria-label="Your System Design progress" className="rounded-lg border border-line/30 bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <ProgressRing value={person.hasAccess ? person.lessonsPassed : 0} total={person.hasAccess ? total : 0} label={person.hasAccess ? "lessons passed" : "Not assigned"} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-muted">Your course</p>
          <h2 className="mt-1 text-2xl font-bold">System Design</h2>
          <p className="mt-2 text-sm text-muted">{statusOf(person, total)}</p>
          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 text-sm lg:grid-cols-4">
            <div><dt className="text-muted">Lessons passed</dt><dd className="mt-1 font-semibold">{person.hasAccess ? `${person.lessonsPassed} / ${total}` : "—"}</dd></div>
            <div><dt className="text-muted">Final best score</dt><dd className="mt-1 font-semibold">{person.finalBest === null ? "Not taken" : `${person.finalBest}%`}</dd></div>
            <div><dt className="text-muted">Due</dt><dd className="mt-1"><DueCell p={person} total={total} /></dd></div>
            <div><dt className="text-muted">Last activity</dt><dd className="mt-1 font-semibold">{lastActiveOf(person)}</dd></div>
          </dl>
          {person.hasAccess ? <><ButtonLink href="/learn/system-design" className="mt-5">Open course</ButtonLink><p className="mt-3 break-words text-sm text-muted">Sign in with Google using {person.email}.</p></> : <p className="mt-5 text-sm text-muted">Ask your company admin to assign this course.</p>}
        </div>
      </div>
    </section>
  );
}
