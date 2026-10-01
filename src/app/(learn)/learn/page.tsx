import type { Metadata } from "next";
import Link from "next/link";
import { signOutLearner } from "./actions";
import { auth } from "@/auth";
import { Appear } from "@/components/motion/Appear";
import { CohortBoard, type BoardDay } from "@/components/learner/CohortBoard";
import { EvidenceProfile } from "@/components/learner/EvidenceProfile";
import { LearnerTopBar } from "@/components/learner/LearnerTopBar";
import { PaymentNotice } from "@/components/learner/PaymentNotice";
import { Wordmark } from "@/components/layout/Wordmark";
import { ButtonLink } from "@/components/ui/Button";
import { contact } from "@/data/config";
import { getTrack } from "@/data/tracks";
import { formatDate } from "@/lib/format";
import { requireLearner } from "@/lib/learner/data";
import { cohortDayDate } from "@/lib/learn";
import { getCurriculum } from "@/data/curricula";

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

  // Each track has its own 30 days. A track whose course is not built yet
  // gets a holding page, never someone else's days.
  const curriculum = getCurriculum(learner.track);
  if (!track.contentLive || !curriculum) {
    return (
      <>
        <LearnerTopBar name={learner.name} image={session?.user?.image} />
        <PaymentNotice email={learner.email} track={track} />
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

  const days: BoardDay[] = curriculum.days.map((d) => ({
    day: d.day,
    week: d.week,
    weekName: curriculum.modules.find((m) => m.week === d.week)?.name ?? "",
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
        <PaymentNotice email={learner.email} track={track} />

      {/* Deep red, lit from the top left and falling to near-black on the
          right; one soft glow drifts slowly behind the text. */}
      <div className="relative overflow-hidden bg-linear-to-br from-red via-red-press to-[#2a0204] text-white">
        <span aria-hidden="true" className="glow-drift pointer-events-none absolute -top-40 -left-24 size-[32rem] rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.14),transparent)]" />
        <div className="relative mx-auto flex max-w-[96rem] flex-wrap items-center justify-between gap-6 px-4 py-10 sm:px-8 sm:py-14">
          <div>
            <Appear y={14}>
              <h1 className="display text-[clamp(1.75rem,4vw,2.75rem)] uppercase">{track.name} cohort</h1>
            </Appear>
            <Appear y={14} delay={0.08}>
              <p className="display mt-2 text-[clamp(1.1rem,2.2vw,1.65rem)] uppercase text-white/80">
                {formatDate(learner.cohort_start)}
              </p>
            </Appear>
          </div>

          <Appear y={14} delay={0.16}>
            <div className="flex flex-wrap items-center gap-5 rounded-card bg-black/25 px-6 py-4 ring-1 ring-white/10 backdrop-blur-sm transition-[background-color,transform] duration-300 hover:-translate-y-0.5 hover:bg-black/30">
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-white/60">
                  Up next · Day {nextDay.day}
                </p>
                <p className="mt-1 truncate text-lg font-extrabold">{nextDay.title}</p>
              </div>
              <ButtonLink href={`/learn/day/${nextDay.day}`} variant="inverse" arrow className="rounded-md px-5 py-2.5 text-[11px]">
                Open Day {nextDay.day}
              </ButtonLink>
            </div>
          </Appear>
        </div>
      </div>

      <div className="mx-auto max-w-[96rem] px-4 py-10 sm:px-8">
        <Appear>
          <CohortBoard days={days} initialDay={nextDay.day} />
        </Appear>

        <Appear className="mt-14">
          <section aria-labelledby="evidence">
            <EvidenceProfile
              githubUsername={learner.github_username}
              linkedinSlug={learner.linkedin_slug}
              githubUrl={learner.github_url}
              linkedinUrl={learner.linkedin_url}
            />
          </section>
          <p className="mt-8 text-xs text-muted">
            Questions about the cohort? <Link href={`mailto:${contact.email}`} className="underline underline-offset-2 hover:text-ink">{contact.email}</Link>
          </p>
        </Appear>
      </div>
    </>
  );
}
