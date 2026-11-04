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
import { getTrack, tracks } from "@/data/tracks";
import { platformLink, platformPrograms, type PlatformProgram } from "@/data/platform-programs";
import { platformSummary } from "@/lib/platform-summary-fetch";
import type { PlatformChallenge, PlatformSummary } from "@/lib/platform-summary";
import type { Track } from "@/types/program";
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
        <span className="absolute top-4 left-4 rounded-full bg-white/95 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-deep">Career track</span>
      </Link>
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div>
          <h2 className="display text-2xl"><Link href={home} className="hover:text-red-deep">{track.name}</Link></h2>
          <p className="mt-1 text-sm text-muted">
            {!curriculum ? "Your place is reserved. Day 1 opens soon."
              : next ? <>Up next · Day {next}{nextTitle ? `: ${nextTitle}` : ""}</>
              : "Track complete. All 30 days submitted."}
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

/** A track they could add: its photo and one line, the page to read, and the way to start. */
function MoreTrackCard({ track }: { track: Track }) {
  const image = trackImages[track.slug];
  return (
    <article className="card flex flex-col overflow-hidden">
      <Link href={`/tracks/${track.slug}`} className="relative block aspect-[16/7] overflow-hidden bg-surface">
        <Image src={image.src} alt="" fill sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw" placeholder="blur" className="object-cover" />
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">Career track · 30 days</p>
        <h3 className="text-lg font-extrabold">{track.name}</h3>
        <p className="text-sm text-muted">{track.description}</p>
        <div className="mt-auto flex flex-wrap items-center gap-4 pt-1">
          <ButtonLink href={`/register?track=${track.slug}`} arrow className="rounded-md px-4 py-2 text-xs">Start this track</ButtonLink>
          <Link href={`/tracks/${track.slug}`} className="text-sm font-semibold underline underline-offset-4 hover:text-red-deep">View track</Link>
        </div>
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

/** "Opens in a new tab" link to app.klymb.ai, the same on every card that leaves the site. */
function OutLink({ path, children, solid }: { path: string; children: React.ReactNode; solid?: boolean }) {
  return (
    <a
      href={platformLink(path)}
      target="_blank"
      rel="noopener"
      className={solid
        ? "inline-flex items-center gap-2 self-start rounded-md bg-red-strong px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-red-press"
        : "self-start text-sm font-bold underline underline-offset-4 hover:text-red-deep"}
    >
      {children}<span aria-hidden="true"> ↗</span><span className="sr-only"> (opens app.klymb.ai in a new tab)</span>
    </a>
  );
}

/** A 60-day challenge they are on, with where they are; the work itself is on app.klymb.ai. */
function ChallengeCard({ challenge }: { challenge: PlatformChallenge }) {
  const path = platformPrograms.find((p) => p.domain === challenge.domain)?.path ?? "/dashboard";
  const done = challenge.lifecycle === "completed";
  return (
    <article className="card flex flex-col gap-4 p-6">
      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">app.klymb.ai · 60-day challenge</p>
      <div>
        <h2 className="display text-2xl">{challenge.title}</h2>
        <p className="mt-1 text-sm text-muted">
          {done ? `Complete. All ${challenge.totalDays} days submitted.`
            : `Day ${challenge.currentDay} of ${challenge.totalDays}${challenge.currentStreak > 1 ? ` · ${challenge.currentStreak}-day streak` : ""}`}
        </p>
      </div>
      <div className="mt-auto flex flex-col gap-4">
        <div>
          <Bar done={challenge.daysCompleted} total={challenge.totalDays} />
          <p className="mt-2 text-xs font-bold text-muted nums">{challenge.daysCompleted} of {challenge.totalDays} days submitted</p>
        </div>
        <OutLink path={path} solid>{done ? "Open on app.klymb.ai" : "Continue on app.klymb.ai"}</OutLink>
      </div>
    </article>
  );
}

/** Their app.klymb.ai profile strength, as app.klymb.ai scores it, and what would raise it. */
function ProfileCard({ summary }: { summary: PlatformSummary }) {
  if (!summary.hasUser) {
    return (
      <section aria-labelledby="profile-title" className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-line/40 bg-card p-5">
        <div>
          <h2 id="profile-title" className="text-lg font-extrabold">Your profile</h2>
          <p className="mt-1 text-sm text-muted">Recruiters find people through their app.klymb.ai profile. You don&apos;t have one yet.</p>
        </div>
        <OutLink path="/" solid>Create your profile</OutLink>
      </section>
    );
  }
  const { score, missing, ready } = summary.profile;
  return (
    <section aria-labelledby="profile-title" className="flex flex-wrap items-center justify-between gap-5 rounded-card border border-line/40 bg-card p-5">
      <div className="min-w-0 flex-1">
        <h2 id="profile-title" className="text-lg font-extrabold">Your profile is {score}% complete</h2>
        <div className="mt-2 max-w-md"><Bar done={score} total={100} /></div>
        <p className="mt-2 text-sm text-muted">
          {missing.length ? <>Still to add: {missing.join(", ")}.</> : ready ? "Ready for recruiters." : "Almost there."}
        </p>
      </div>
      <OutLink path="/profile" solid>{score >= 100 ? "View your profile" : "Complete your profile"}</OutLink>
    </section>
  );
}

/** An app.klymb.ai program: it opens there, in a new tab. */
function PlatformCard({ program, status }: { program: PlatformProgram; status?: string }) {
  return (
    <article className="flex flex-col gap-3 rounded-card border border-line/40 bg-card p-5">
      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">app.klymb.ai · {program.kind}</p>
      <h3 className="text-lg font-extrabold">{program.title}</h3>
      <p className="text-sm text-muted">{program.line}</p>
      {(status ?? program.note) && <p className="text-xs font-bold text-red-deep">{status ?? program.note}</p>}
      <a href={platformLink(program.path)} target="_blank" rel="noopener" className="mt-auto self-start pt-1 text-sm font-bold underline underline-offset-4 hover:text-red-deep">
        Open on app.klymb.ai<span aria-hidden="true"> ↗</span><span className="sr-only"> (opens in a new tab)</span>
      </a>
    </article>
  );
}

/**
 * The dashboard: every course this person has, each with how far they are
 * and the one next step; then every course they don't have yet, tracks and
 * System Design here, and app.klymb.ai's programs, which open there.
 */
export default async function DashboardPage() {
  const state = await getLearnerState();
  if (state.state === "signed-out") redirect("/learn/login");
  if (state.state === "other-device") redirect("/learn/login?error=device");

  const session = await auth();
  const email = state.state === "enrolled" ? state.learner.email : state.email;
  const [places, seat, platform] = await Promise.all([getLearnerTracks(), systemDesignSeat(email), platformSummary(email)]);
  // Their app.klymb.ai challenges that still mean something: on now, or finished. An ended one stays off.
  const challenges = platform?.hasUser ? platform.challenges.filter((c) => c.lifecycle !== "ended") : [];
  const joined = new Set(challenges.map((c) => c.domain));
  const hackathon = platform?.hasUser ? platform.hackathon : null;
  const programs = platformPrograms.filter((p) => !p.domain || !joined.has(p.domain));
  const name = places[0]?.learner.name || session?.user?.name || email.split("@")[0];
  const firstName = name.split(" ")[0];
  const none = !places.length && !seat && !challenges.length;
  const mine = new Set(places.map((p) => p.learner.track));
  const moreTracks = tracks.filter((t) => !mine.has(t.slug));

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
            {challenges.map((c) => <ChallengeCard key={c.domain} challenge={c} />)}
          </Appear>
        )}

        {platform && <Appear y={12} delay={0.09} className="mt-8"><ProfileCard summary={platform} /></Appear>}

        {(moreTracks.length > 0 || !seat) && (
          <Appear y={12} delay={0.12} className="mt-14">
            <h2 className="text-xl font-extrabold">{none ? "Start a course" : "More courses"}</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {moreTracks.map((t) => <MoreTrackCard key={t.slug} track={t} />)}
              {!seat && <MoreSystemDesignCard />}
            </div>
          </Appear>
        )}

        <Appear y={12} delay={0.16} className="mt-14">
          <h2 className="text-xl font-extrabold">On app.klymb.ai</h2>
          <p className="mt-1 text-sm text-muted">Programs on our community platform. They open there, with its own sign-in.</p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {programs.map((p) => (
              <PlatformCard
                key={p.path}
                program={p}
                status={p.hackathon && hackathon ? (hackathon.submitted ? "You've submitted" : hackathon.registered ? "You're registered" : undefined) : undefined}
              />
            ))}
          </div>
        </Appear>

        <p className="mt-14 text-xs text-muted">
          Questions? <Link href={`mailto:${contact.email}`} className="underline underline-offset-2 hover:text-ink">{contact.email}</Link>
        </p>
      </div>
    </>
  );
}
