import { cohort } from "@/data/config";
import { formatDate } from "@/lib/format";

export function AnnouncementBar() {
  return (
    <div className="bg-red-strong text-white">
      <p className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] sm:px-6 sm:text-xs">
        <span className="tick" aria-hidden="true">✦</span>
        <span>Next cohort starts {formatDate(cohort.startDate)}</span>
        <span aria-hidden="true" className="opacity-60">•</span>
        <span>
          Enrollment closes {formatDate(cohort.enrollmentDeadline)}
          {cohort.enrollmentDeadlineIsPlaceholder && <span className="font-semibold normal-case opacity-75"> (date to be confirmed)</span>}
        </span>
        <span aria-hidden="true" className="opacity-60">•</span>
        <span>Limited seats</span>
      </p>
    </div>
  );
}
