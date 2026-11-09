import Link from "next/link";
import { ArrowDown, ArrowRight, CircleCheck, Circle } from "lucide-react";
import { learnerButton } from "@/components/learner/learner-ui";

const submittedOn = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(iso));

/**
 * Where this day stands and the one thing to do about it, above the long
 * mission and build steps. Not submitted: go and submit. Submitted: carry on
 * to the next day, or, on the last day, back to the dashboard.
 */
export function DayStatus({
  day, submittedAt, next,
}: { day: number; submittedAt: string | null; next: { day: number; title: string } | null }) {
  if (!submittedAt) {
    return (
      <section aria-label={`Day ${day} status`} className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-line/25 bg-card p-4 shadow-card sm:p-5">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-muted">
            <Circle aria-hidden="true" className="size-4" /> Not submitted yet
          </p>
          <p className="mt-1.5 text-sm text-muted sm:text-base">
            Read the mission, do the work, then submit your link{" "}
            and answers. {next ? `Day ${next.day} opens once you do.` : "This is the last day of the track."}
          </p>
        </div>
        <a href="#submit" className={learnerButton("primary", "w-full sm:w-auto")}>
          Go to submission <ArrowDown aria-hidden="true" className="size-4" />
        </a>
      </section>
    );
  }

  return (
    <section aria-label={`Day ${day} status`} className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-red-strong/30 bg-red-tint p-4 sm:p-5">
      <div className="min-w-0">
        <p className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-red-deep">
          <CircleCheck aria-hidden="true" className="size-4" /> Submitted on {submittedOn(submittedAt)}
        </p>
        <p className="mt-1.5 text-sm text-ink/80 sm:text-base">
          {next ? `Day ${next.day} is open. You can still update this submission.` : "That's every day of the track. You can still update this submission."}
        </p>
      </div>
      <div className="flex w-full flex-wrap gap-3 sm:w-auto">
        {next ? (
          <Link href={`/learn/day/${next.day}`} className={learnerButton("primary", "w-full sm:w-auto")}>
            Continue to Day {next.day} <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        ) : (
          <Link href="/learn#your-days" className={learnerButton("primary", "w-full sm:w-auto")}>
            Back to your dashboard <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        )}
        <a href="#submit" className={learnerButton("secondary", "w-full sm:w-auto")}>Update submission</a>
      </div>
    </section>
  );
}
