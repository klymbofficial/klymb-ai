import type { Metadata } from "next";
import Link from "next/link";
import { signOutLearner } from "./actions";
import { Appear } from "@/components/motion/Appear";
import { Counter } from "@/components/motion/Counter";
import { DayGrid } from "@/components/learner/DayGrid";
import { Wordmark } from "@/components/layout/Wordmark";
import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { contact } from "@/data/config";
import { getTrack } from "@/data/tracks";
import { formatDate } from "@/lib/format";
import { requireLearner } from "@/lib/learner/data";
import { thirtyDays } from "@/lib/learn";

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
          different email, sign in with that one — otherwise write to {contact.email} and we will sort it out.
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
  const days = thirtyDays(track);
  const doneDays = new Set(submissions.map((s) => s.day));
  const nextDay = days.find((d) => !doneDays.has(d.day)) ?? days[days.length - 1];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-line pb-5">
        <div>
          <Wordmark className="text-xl" />
          <p className="mt-1 text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted">
            {track.name} · cohort {formatDate(learner.cohort_start)}
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="hidden text-muted sm:inline">{learner.name}</span>
          <form action={signOutLearner}>
            <button type="submit" className="border border-line px-3 py-1.5 text-xs font-bold uppercase tracking-wider hover:border-ink">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <Appear className="mt-8">
        <Eyebrow>Where you are</Eyebrow>
        <h1 className="display mt-3 text-5xl">
          <Counter value={submissions.length} /> of 30 days submitted
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          Every day you ship one deliverable into your portfolio. Assessments fall on days 7, 14, 21 and 28;
          mock interviews on 29 and 30.
        </p>
      </Appear>

      <Appear delay={0.05} className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-2 border-ink bg-ink p-6 text-paper">
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/55">Up next · Day {nextDay.day}</p>
            <p className="display mt-1 truncate text-2xl">
              {nextDay.kind === "challenge" ? nextDay.challenge.title : nextDay.kind === "assessment" ? nextDay.title : "Mock interview"}
            </p>
          </div>
          <ButtonLink href={`/learn/day/${nextDay.day}`} variant="inverse" arrow>Open Day {nextDay.day}</ButtonLink>
        </div>
      </Appear>

      <section aria-labelledby="all-days" className="mt-10">
        <h2 id="all-days" className="display text-2xl">Your 30 days</h2>
        <p className="mt-1 mb-4 text-sm text-muted">Submitted days are filled. Assessment days are marked in red.</p>
        <DayGrid days={days} submitted={[...doneDays]} />
      </section>

      <section aria-labelledby="evidence" className="mt-10 border-t-2 border-line pt-6">
        <h2 id="evidence" className="display text-2xl">Your evidence</h2>
        <ul className="mt-3 flex flex-wrap gap-6 text-sm">
          <li>
            <span className="block text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">GitHub</span>
            {learner.github_url
              ? <a href={learner.github_url} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4">{learner.github_url.replace(/^https?:\/\//, "")}</a>
              : <span className="text-muted">Add it on Day 1 — it is where every artifact lands.</span>}
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
  );
}
