import Link from "next/link";
import { cohort } from "@/data/config";
import { formatDate } from "@/lib/format";

export function AnnouncementBar() {
  return (
    <div className="bg-red-strong text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-xs font-bold uppercase tracking-wider sm:px-6 sm:text-sm">
        <span className="tick size-2 bg-white" aria-hidden="true" />
        <span>Next cohort starts {formatDate(cohort.startDate)}</span>
        <span className="hidden opacity-70 sm:inline" aria-hidden="true">/</span>
        <span>
          Enrolment closes {formatDate(cohort.enrollmentDeadline)}
          {cohort.enrollmentDeadlineIsPlaceholder && <span className="normal-case opacity-80"> (date TBC)</span>}
        </span>
        <Link href="/register" className="ml-auto underline underline-offset-4 hover:no-underline">Reserve a seat</Link>
      </div>
    </div>
  );
}
