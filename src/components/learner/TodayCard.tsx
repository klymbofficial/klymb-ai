import Link from "next/link";
import { ArrowRight, CircleCheck, Clock, Lock } from "lucide-react";
import { learnerButton } from "@/components/learner/learner-ui";
import { MAX_NEW_DAYS_PER_DAY } from "@/lib/learner/integrity";
import type { TodayAction } from "@/lib/learner/today";
import type { DayKind } from "@/types/curriculum";

const KIND_LABEL: Record<DayKind, string> = { build: "Required", assessment: "Assessment", interview: "Interview prep" };

export interface TodayDay { day: number; title: string; mission: string; estimateMinutes: number; kind: DayKind }

/**
 * "What should I do today?": one card, one primary action. Which of its five
 * states shows is decided by `todayAction`, from the learner's submissions.
 */
export function TodayCard({
  action, day, total, base, canPractise,
}: {
  action: TodayAction;
  day: TodayDay | null;
  total: number;
  /** The track's own page, e.g. /learn/tracks/qa-engineer: a person can be on several. */
  base: string;
  /** The track has a voice-coach topic list. */
  canPractise: boolean;
}) {
  if (action.kind === "complete") {
    return (
      <Shell id="today-title" eyebrow="Track complete" icon={<CircleCheck aria-hidden="true" className="size-4" />}>
        <h2 id="today-title" className="display text-2xl text-balance sm:text-3xl">All {total} days submitted</h2>
        <p className="mt-2 max-w-xl text-sm text-muted sm:text-base">
          There is no next day. Reopen any submitted day to review or update it, or practise out loud.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a href="#your-days" className={learnerButton("primary")}>Review your days <ArrowRight aria-hidden="true" className="size-4" /></a>
          {canPractise && <Link href={`${base}/coach`} className={learnerButton("secondary")}>Practise with the voice coach</Link>}
          <a href="#achievements-title" className={learnerButton("secondary")}>Your badges</a>
        </div>
      </Shell>
    );
  }

  if (!day) return null;
  const meta = (
    <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold text-muted">
      <span className="inline-flex items-center gap-1.5"><Clock aria-hidden="true" className="size-4" />About {day.estimateMinutes} min</span>
      <span>{KIND_LABEL[day.kind]}</span>
    </p>
  );
  const title = <h2 id="today-title" className="display text-2xl text-balance sm:text-3xl">Day {day.day}: {day.title}</h2>;
  const mission = <p className="mt-2 line-clamp-3 max-w-2xl text-sm text-muted sm:text-base">{day.mission}</p>;

  if (action.kind === "pay") {
    return (
      <Shell id="today-title" eyebrow="Next step" icon={<Lock aria-hidden="true" className="size-4" />}>
        {title}
        <p className="mt-2 max-w-xl text-sm text-muted sm:text-base">Day {day.day} opens once you unlock the full course.</p>
        <div className="mt-5"><Link href={`${base}/day/${day.day}`} className={learnerButton("primary")}>Unlock the full course <ArrowRight aria-hidden="true" className="size-4" /></Link></div>
      </Shell>
    );
  }

  if (action.kind === "paced") {
    return (
      <Shell id="today-title" eyebrow="Done for today" icon={<CircleCheck aria-hidden="true" className="size-4" />}>
        <h2 id="today-title" className="display text-2xl text-balance sm:text-3xl">You&apos;ve reached today&apos;s limit</h2>
        <p className="mt-2 max-w-xl text-sm text-muted sm:text-base">
          {MAX_NEW_DAYS_PER_DAY} new days is the most you can submit in one day. Day {day.day}: {day.title} opens for submission tomorrow.
        </p>
        <div className="mt-5"><Link href={`${base}/day/${day.day}`} className={learnerButton("secondary")}>Read Day {day.day} now</Link></div>
      </Shell>
    );
  }

  return (
    <Shell id="today-title" eyebrow={action.started ? "Today" : "Start here"}>
      {title}
      {mission}
      {meta}
      <div className="mt-5">
        <Link href={`${base}/day/${day.day}`} className={learnerButton("primary", "w-full sm:w-auto")}>
          {action.started ? `Continue with Day ${day.day}` : `Start Day ${day.day}`} <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </Shell>
  );
}

function Shell({ id, eyebrow, icon, children }: { id: string; eyebrow: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-card bg-card p-5 text-ink shadow-float sm:p-7">
      <p className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-red-deep">{icon}{eyebrow}</p>
      <div className="mt-2">{children}</div>
    </section>
  );
}
