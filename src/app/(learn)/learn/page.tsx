import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Appear } from "@/components/motion/Appear";
import { LearnerTopBar } from "@/components/learner/LearnerTopBar";
import { ButtonLink } from "@/components/ui/Button";
import { contact } from "@/data/config";
import { getCurriculum } from "@/data/curricula";
import { trackImages } from "@/data/track-images";
import { challenges, getTrack, publicPath, tracks } from "@/data/tracks";
import type { Track } from "@/types/program";
import { COURSES } from "@/data/courses/registry";
import type { Course } from "@/data/courses/types";
import { courseProgressSummary } from "@/lib/course-progress";
import { readProfile } from "@/lib/profile";
import { HACKATHON, hackathonPhase, type HackathonPhase } from "@/data/hackathon";
import { myTeam, publishedResults, type MyTeam } from "@/lib/hackathon";
import { scoreProfile, type ProfileScore } from "@/lib/profile-score";
import { dayActionLabel, nextDayFor } from "@/lib/day-lock";
import { getLearnerState, getLearnerTracks } from "@/lib/learner/data";
import { systemDesignSeat, type SystemDesignSeat } from "@/lib/learner/courses";
import type { Learner, Submission } from "@/lib/learner/data";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };

/** A thin bar for "how far through", the same on every card. */
function Bar({ done, total, light }: { done: number; total: number; light?: boolean }) {
  const percent = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className={`h-1.5 overflow-hidden rounded-full ${light ? "bg-white/15" : "bg-line/20"}`} role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label={`${done} of ${total}`}>
      <div className={`h-full rounded-full ${light ? "bg-[#e7c97a]" : "bg-red-strong"}`} style={{ width: `${Math.max(2, percent)}%` }} />
    </div>
  );
}

function TrackCard({ learner, submissions }: { learner: Learner; submissions: Submission[] }) {
  const track = getTrack(learner.track)!;
  const curriculum = track.contentLive ? getCurriculum(learner.track) : undefined;
  const home = `/learn/tracks/${learner.track}`;
  const total = curriculum?.days.length ?? 30;
  const done = new Set(submissions.map((s) => s.day)).size;
  const next = curriculum ? nextDayFor(submissions.map((s) => s.day), total) : null;
  const nextTitle = next ? curriculum?.days.find((d) => d.day === next)?.title : undefined;
  const image = trackImages[learner.track];

  return (
    <article className="card flex flex-col overflow-hidden">
      <Link href={home} className="relative block aspect-[16/7] overflow-hidden bg-surface">
        <Image src={image.src} alt="" fill sizes="(min-width: 1024px) 40vw, 100vw" placeholder="blur" className="object-cover" />
        <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <span className="absolute top-4 left-4 rounded-full bg-white/95 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-deep">{track.kind === "challenge" ? `${total}-day challenge` : "Career track"}</span>
      </Link>
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div>
          <h2 className="display text-2xl"><Link href={home} className="hover:text-red-deep">{track.name}</Link></h2>
          <p className="mt-1 text-sm text-muted">
            {!curriculum ? "Your place is reserved. Day 1 opens soon."
              : next ? <>Up next · Day {next}{nextTitle ? `: ${nextTitle}` : ""}</>
              : `${track.kind === "challenge" ? "Challenge" : "Track"} complete. All ${total} days submitted.`}
          </p>
        </div>
        {curriculum && (
          <div>
            <Bar done={done} total={total} />
            <p className="mt-2 text-xs font-bold text-muted nums">{done} of {total} days submitted</p>
          </div>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-4">
          {curriculum && next
            ? <ButtonLink href={`${home}/day/${next}`} arrow className="rounded-md px-5 py-2.5 text-xs">{dayActionLabel(next, false)}</ButtonLink>
            : <ButtonLink href={home} arrow className="rounded-md px-5 py-2.5 text-xs">Open track</ButtonLink>}
          {curriculum && next && <Link href={home} className="text-sm font-semibold underline underline-offset-4 hover:text-red-deep">Open track</Link>}
        </div>
      </div>
    </article>
  );
}

/** In the System Design course's own night-sky look, so it reads as its own product. */
function SystemDesignCard({ seat }: { seat: SystemDesignSeat }) {
  const action = seat.finished ? "Open the course" : seat.passed === 0 ? "Start the course" : "Continue the course";
  return (
    <article className="relative flex flex-col overflow-hidden rounded-card bg-[#1a1716] text-[#f6efe4] shadow-card">
      <span aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(70% 80% at 0% 0%,rgba(201,162,74,.2),transparent 70%),radial-gradient(60% 80% at 100% 100%,rgba(131,5,11,.5),transparent 70%)" }} />
      <div className="relative flex flex-1 flex-col gap-4 p-6">
        <p className="text-xs font-extrabold uppercase tracking-[.12em] text-[#e7c97a]">Course</p>
        <div>
          <h2 className="display text-2xl text-[#fbf6ee]">System Design</h2>
          <p className="mt-1 text-sm text-[#d9cfc2]">{seat.finished ? "Course complete. Every lesson and the final passed." : "One short lesson a day, built for interviews."}</p>
        </div>
        {/* Progress sits with the button at the foot, level with the track card's beside it. */}
        <div className="mt-auto flex flex-col gap-4">
          <div>
            <Bar done={seat.passed} total={seat.total} light />
            <p className="mt-2 text-xs font-bold text-[#b9ad9f] nums">{seat.passed} of {seat.total} lessons passed</p>
          </div>
          <Link href="/learn/system-design" className="group inline-flex items-center gap-2 self-start rounded-md bg-[#fbf6ee] px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-[#83050b] transition-colors hover:bg-white">
            {action} <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </div>
      </div>
    </article>
  );
}

/** A track or challenge they could add: its picture and one line, the page to read, and the way to start. */
function MoreTrackCard({ track }: { track: Track }) {
  const image = trackImages[track.slug];
  return (
    <article className="card flex flex-col overflow-hidden">
      <Link href={publicPath(track)} className="relative block aspect-[16/7] overflow-hidden bg-surface">
        <Image src={image.src} alt="" fill sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw" placeholder="blur" className="object-cover" />
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">{track.kind === "challenge" ? "Challenge · 60 days" : "Career track · 30 days"}</p>
        <h3 className="text-lg font-extrabold">{track.name}</h3>
        <p className="text-sm text-muted">{track.description}</p>
        <div className="mt-auto flex flex-wrap items-center gap-4 pt-1">
          <ButtonLink href={`/register?track=${track.slug}`} arrow className="rounded-md px-4 py-2 text-xs">{track.kind === "challenge" ? "Start this challenge" : "Start this track"}</ButtonLink>
          <Link href={publicPath(track)} className="text-sm font-semibold underline underline-offset-4 hover:text-red-deep">{track.kind === "challenge" ? "View challenge" : "View track"}</Link>
        </div>
      </div>
    </article>
  );
}

/** How complete their profile is, and the most valuable thing to add next. */
function ProfileCard({ score }: { score: ProfileScore }) {
  return (
    <section aria-labelledby="profile-title" className="flex flex-wrap items-center justify-between gap-5 rounded-card border border-line/40 bg-card p-5">
      <div className="min-w-0 flex-1">
        <h2 id="profile-title" className="text-lg font-extrabold">{score.ready ? "Your profile is ready" : `Your profile is ${score.score}% complete`}</h2>
        <div className="mt-2 max-w-md"><Bar done={score.score} total={100} /></div>
        {score.missing.length > 0 && <p className="mt-2 text-sm text-muted">Still to add: {score.missing.slice(0, 3).join(", ")}.</p>}
      </div>
      <ButtonLink href="/learn/profile" arrow className="rounded-md px-5 py-2.5 text-xs">{score.score >= 100 ? "View your profile" : "Complete your profile"}</ButtonLink>
    </section>
  );
}

/** The hackathon: their team and next step once registered, otherwise what's open. */
function HackathonCard({ team, phase }: { team: MyTeam | null; phase: HackathonPhase }) {
  const status = {
    "coming-soon": "The next one is coming. Get told when registration opens.",
    registration: team ? "Registered. Share your team code before registration closes." : "Registration is open: solo or a team of up to three.",
    closed: team ? `Registered. The build starts ${HACKATHON.kickoffLabel}.` : "Registration has closed.",
    live: team ? (team.entry ? "Entry saved. You can change it until the deadline." : `The build is on. Submit by ${HACKATHON.deadlineLabel}.`) : "The build is on.",
    judging: team ? "Judging is under way." : "Judging is under way.",
    results: "The winners are out.",
  }[phase];
  return (
    <article className="card flex flex-col gap-3 p-5">
      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">Hackathon · 48 hours</p>
      <h3 className="text-lg font-extrabold">{HACKATHON.name}</h3>
      <p className="text-sm text-muted">{status}</p>
      <ButtonLink href={team ? "/learn/hackathon" : "/hackathons"} arrow className="mt-auto self-start rounded-md px-4 py-2 text-xs">
        {team ? (phase === "live" && !team.entry ? "Submit your entry" : "Go to your team") : phase === "registration" ? "Register" : "See the hackathon"}
      </ButtonLink>
    </article>
  );
}

/** A self-paced course they have opened: modules done and the next one to read. */
function SelfPacedCard({ course, done }: { course: Course; done: string[] }) {
  const next = course.modules.find((m) => !done.includes(m.slug));
  const total = course.modules.length;
  const count = course.modules.filter((m) => done.includes(m.slug)).length;
  return (
    <article className="card flex flex-col gap-4 p-6">
      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">Course · {total} modules</p>
      <div>
        <h2 className="display text-2xl"><Link href={`/courses/${course.slug}`} className="hover:text-red-deep">{course.title}</Link></h2>
        <p className="mt-1 text-sm text-muted">{next ? `Up next · Module ${next.number}: ${next.title}` : "Course complete. Every module done."}</p>
      </div>
      <div className="mt-auto flex flex-col gap-4">
        <div>
          <Bar done={count} total={total} />
          <p className="mt-2 text-xs font-bold text-muted nums">{count} of {total} modules done</p>
        </div>
        <ButtonLink href={next ? `/learn/courses/${course.slug}/${next.slug}` : `/courses/${course.slug}`} arrow className="self-start rounded-md px-5 py-2.5 text-xs">
          {next ? (count ? `Continue module ${next.number}` : "Start module 1") : "Review the course"}
        </ButtonLink>
      </div>
    </article>
  );
}

/** A self-paced course they haven't opened yet. */
function MoreCourseCard({ course }: { course: Course }) {
  return (
    <article className="card flex flex-col gap-3 p-5">
      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">Course · {course.modules.length} modules</p>
      <h3 className="text-lg font-extrabold">{course.title}</h3>
      <p className="text-sm text-muted">{course.tagline}</p>
      <div className="mt-auto flex flex-wrap items-center gap-4 pt-1">
        <ButtonLink href={`/learn/courses/${course.slug}/${course.modules[0].slug}`} arrow className="rounded-md px-4 py-2 text-xs">Start module 1</ButtonLink>
        <Link href={`/courses/${course.slug}`} className="text-sm font-semibold underline underline-offset-4 hover:text-red-deep">View course</Link>
      </div>
    </article>
  );
}

/** System Design, for someone who hasn't got it. */
function MoreSystemDesignCard() {
  return (
    <article className="relative flex flex-col gap-3 overflow-hidden rounded-card bg-[#1a1716] p-5 text-[#f6efe4] shadow-card">
      <span aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(70% 80% at 0% 0%,rgba(201,162,74,.2),transparent 70%)" }} />
      <p className="relative text-xs font-extrabold uppercase tracking-[.12em] text-[#e7c97a]">Course · 21 days</p>
      <h3 className="relative text-lg font-extrabold text-[#fbf6ee]">System Design</h3>
      <p className="relative text-sm text-[#d9cfc2]">Short daily lessons on your phone, built for system design interviews.</p>
      <Link href="/system-design" className="group relative mt-auto inline-flex items-center gap-2 self-start rounded-md bg-[#fbf6ee] px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-[#83050b] transition-colors hover:bg-white">
        See System Design <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
      </Link>
    </article>
  );
}

/**
 * The dashboard: every course this person has, each with how far they are
 * and the one next step; then every course they don't have yet.
 */
export default async function DashboardPage() {
  const state = await getLearnerState();
  if (state.state === "signed-out") redirect("/learn/login");
  if (state.state === "other-device") redirect("/learn/login?error=device");
  // Rendered by the learner error page (retry), never mistaken for a missing enrolment.
  if (state.state === "unavailable") throw new Error("Learner data is unavailable");

  const session = await auth();
  const email = state.state === "enrolled" ? state.learner.email : state.email;
  const [places, seat, reading, { profile }] = await Promise.all([getLearnerTracks(), systemDesignSeat(email), courseProgressSummary(email), readProfile(email, session?.user?.name)]);
  const profileScore = scoreProfile(profile, { hasPhoto: !!session?.user?.image });
  const [team, results] = await Promise.all([myTeam(email), publishedResults()]);
  const phase = hackathonPhase(results.length > 0);
  const opened = COURSES.filter((c) => reading[c.slug]);
  const unopened = COURSES.filter((c) => !reading[c.slug]);
  const name = places[0]?.learner.name || session?.user?.name || email.split("@")[0];
  const firstName = name.split(" ")[0];
  const none = !places.length && !seat && !opened.length && !team;
  const mine = new Set(places.map((p) => p.learner.track));
  const moreTracks = [...tracks, ...challenges].filter((t) => !mine.has(t.slug));

  return (
    <>
      <LearnerTopBar name={name} image={session?.user?.image} />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-14">
        <Appear y={12}>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-red-deep">Dashboard</p>
          <h1 className="display mt-3 text-[clamp(1.9rem,4vw,2.75rem)]">{none ? `Welcome, ${firstName}` : `Your courses, ${firstName}`}</h1>
          {none && (
            <p className="mt-3 max-w-2xl text-muted">
              There&apos;s no course on <strong className="text-ink">{email}</strong> yet. Pick one below. If you paid or
              registered with a different Google account, log out and use that one, or write to {contact.email}.
            </p>
          )}
        </Appear>

        {!none && (
          <Appear y={12} delay={0.06} className="mt-8 grid gap-6 lg:grid-cols-2">
            {places.map((p) => <TrackCard key={p.learner.id} learner={p.learner} submissions={p.submissions} />)}
            {seat && <SystemDesignCard seat={seat} />}
            {opened.map((c) => <SelfPacedCard key={c.slug} course={c} done={reading[c.slug].done} />)}
            {team && <HackathonCard team={team} phase={phase} />}
          </Appear>
        )}

        <Appear y={12} delay={0.09} className="mt-8"><ProfileCard score={profileScore} /></Appear>

        {(moreTracks.length > 0 || !seat || unopened.length > 0 || !team) && (
          <Appear y={12} delay={0.12} className="mt-14">
            <h2 className="text-xl font-extrabold">{none ? "Start a course" : "More courses"}</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {moreTracks.map((t) => <MoreTrackCard key={t.slug} track={t} />)}
              {!seat && <MoreSystemDesignCard />}
              {unopened.map((c) => <MoreCourseCard key={c.slug} course={c} />)}
              {!team && <HackathonCard team={null} phase={phase} />}
            </div>
          </Appear>
        )}

        <p className="mt-14 text-xs text-muted">
          Questions? <Link href={`mailto:${contact.email}`} className="underline underline-offset-2 hover:text-ink">{contact.email}</Link>
        </p>
      </div>
    </>
  );
}
