import type { Metadata } from "next";
import Link from "next/link";
import { signOutLearner } from "./actions";
import { auth } from "@/auth";
import { Appear } from "@/components/motion/Appear";
import { CohortBoard, type BoardDay } from "@/components/learner/CohortBoard";
import { EvidenceProfile } from "@/components/learner/EvidenceProfile";
import { LearnerTopBar } from "@/components/learner/LearnerTopBar";
import { Wordmark } from "@/components/layout/Wordmark";
import { ButtonLink } from "@/components/ui/Button";
import { contact } from "@/data/config";
import { getTrack } from "@/data/tracks";
import { formatDate } from "@/lib/format";
import { requireLearner } from "@/lib/learner/data";
import { cohortDayDate } from "@/lib/learn";
import { pmCurriculum, pmModules } from "@/data/pm-curriculum";

export const metadata: Metadata = { title: "My cohort", robots: { index: false, follow: false } };

export default async function LearnHomePage() {
  const state = await requireLearner();

  if (state.state === "not-enrolled") {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <Wordmark className="text-2xl" />
        <h1 className="display mt-8 text-3xl">You are signed in, but not enrolled yet</h1>
        <p className="mt-3 text-muted">
          We could not find a cohort place for <strong className="text-ink">{state.email}</strong>. If you registered with a
          different email, sign in with that one: otherwise write to {contact.email} and we will sort it out.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/register?track=project-manager" arrow>Register for the cohort</ButtonLink>
          <form action={signOutLearner}>
            <button type="submit" className="border-2 border-ink px-5 py-3 text-sm font-bold uppercase tracking-wider hover:bg-ink hover:text-paper">
              Sign out
            </button>
          </form>
        </div>
      </div>
    );
  }

  const { learner, submissions } = state;
  const track = getTrack(learner.track)!;
  const session = await auth();

  // The course below is the Project Manager one. A learner on a track whose
  // course is not built yet gets a holding page, never someone else's days.
  if (!track.contentLive) {
    return (
      <>
        <LearnerTopBar name={learner.name} image={session?.user?.image} />
        <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-8">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-red-deep">{track.name} track</p>
          <h1 className="display mt-4 text-4xl text-balance">Your place is reserved. Day 1 opens soon.</h1>
          <p className="mt-4 text-muted">
            The {track.name} course is being finished for this cohort. We will email{" "}
            <strong className="text-ink">{learner.email}</strong> the moment Day 1 is ready: nothing is lost by waiting,
            and your 30 days start from that day.
          </p>
          <p className="mt-6 text-sm text-muted">
            Questions? <Link href={`mailto:${contact.email}`} className="font-semibold underline underline-offset-2">{contact.email}</Link>
          </p>
        </div>
      </>
    );
  }
  const doneDays = new Set(submissions.map((s) => s.day));

  const days: BoardDay[] = pmCurriculum.map((d) => ({
    day: d.day,
    week: d.week,
    weekName: pmModules.find((m) => m.week === d.week)?.name ?? "",
    title: d.title,
    points: d.points,
    estimateMinutes: d.estimateMinutes,
    kind: d.kind,
    date: cohortDayDate(learner.cohort_start, d.day),
    submitted: doneDays.has(d.day),
  }));

  const nextDay = days.find((d) => !d.submitted) ?? days[days.length - 1];

  return (
    <>
      <LearnerTopBar name={learner.name} image={session?.user?.image} />

      <div className="bg-gradient-to-r from-red to-red-strong text-white">
        <div className="mx-auto flex max-w-[96rem] flex-wrap items-center justify-between gap-6 px-4 py-10 sm:px-8 sm:py-14">
          <div>
            <h1 className="display text-[clamp(1.75rem,4vw,2.75rem)] uppercase">{track.name} cohort</h1>
            <p className="display mt-2 text-[clamp(1.1rem,2.2vw,1.65rem)] uppercase text-white/85">
              {formatDate(learner.cohort_start)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-5 rounded-card bg-night px-6 py-4">
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-white/55">
                Up next · Day {nextDay.day}
              </p>
              <p className="mt-1 truncate text-lg font-extrabold">{nextDay.title}</p>
            </div>
            <ButtonLink href={`/learn/day/${nextDay.day}`} variant="inverse" arrow className="rounded-md px-5 py-2.5 text-[11px]">
              Open Day {nextDay.day}
            </ButtonLink>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[96rem] px-4 py-10 sm:px-8">
        <Appear>
          <CohortBoard days={days} initialDay={nextDay.day} />
        </Appear>

        <section aria-labelledby="evidence" className="mt-10">
          <EvidenceProfile githubUsername={learner.github_username} linkedinSlug={learner.linkedin_slug} />
        </section>

        <section aria-labelledby="evidence-links" className="card mt-8 rounded-card p-6 sm:p-8">
          <h2 id="evidence-links" className="display text-2xl">Your evidence</h2>
          <ul className="mt-4 flex flex-wrap gap-8 text-sm">
            <li>
              <span className="block text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">GitHub</span>
              {learner.github_url
                ? <a href={learner.github_url} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4">{learner.github_url.replace(/^https?:\/\//, "")}</a>
                : <span className="text-muted">Add it on Day 1: it is where every artifact lands.</span>}
            </li>
            <li>
              <span className="block text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">LinkedIn</span>
              {learner.linkedin_url
                ? <a href={learner.linkedin_url} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4">Profile</a>
                : <span className="text-muted">Update your headline this week.</span>}
            </li>
          </ul>
          <p className="mt-6 text-xs text-muted">
            Questions about the cohort? <Link href={`mailto:${contact.email}`} className="underline underline-offset-2">{contact.email}</Link>
          </p>
        </section>
      </div>
    </>
  );
}
