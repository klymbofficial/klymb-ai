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
import { getTrack } from "@/data/tracks";
import { dayActionLabel, nextDayFor } from "@/lib/day-lock";
import { getLearnerState } from "@/lib/learner/data";
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
            ? <ButtonLink href={`/learn/day/${next}`} arrow className="rounded-md px-5 py-2.5 text-xs">{dayActionLabel(next, false)}</ButtonLink>
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

/** A course they don't have yet: what it is and where to look. */
function AddCard({ eyebrow, title, body, href, cta }: { eyebrow: string; title: string; body: string; href: string; cta: string }) {
  return (
    <article className="flex flex-col gap-3 rounded-card border-2 border-dashed border-line/50 p-6">
      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">{eyebrow}</p>
      <h3 className="text-lg font-extrabold">{title}</h3>
      <p className="text-sm text-muted">{body}</p>
      <ButtonLink href={href} variant="secondary" arrow className="mt-auto self-start rounded-md px-4 py-2 text-xs">{cta}</ButtonLink>
    </article>
  );
}

/**
 * The dashboard: every course this person has, each with how far they are
 * and the one next step, and the courses they could add. Each card leads to
 * that course's own place: a track's page, or the System Design app.
 */
export default async function DashboardPage() {
  const state = await getLearnerState();
  if (state.state === "signed-out") redirect("/learn/login");
  if (state.state === "other-device") redirect("/learn/login?error=device");

  const session = await auth();
  const email = state.state === "enrolled" ? state.learner.email : state.email;
  const learner = state.state === "enrolled" ? state.learner : null;
  const seat = await systemDesignSeat(email);
  const name = learner?.name || session?.user?.name || email.split("@")[0];
  const firstName = name.split(" ")[0];
  const none = !learner && !seat;

  return (
    <>
      <LearnerTopBar
        name={name}
        image={session?.user?.image}
        track={learner?.track}
        submittedDays={state.state === "enrolled" ? state.submissions.map((s) => s.day) : []}
        current="dashboard"
      />

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
            {learner && <TrackCard learner={learner} submissions={state.state === "enrolled" ? state.submissions : []} />}
            {seat && <SystemDesignCard seat={seat} />}
          </Appear>
        )}

        {(!learner || !seat) && (
          <Appear y={12} delay={0.12} className="mt-12">
            <h2 className="text-xl font-extrabold">{none ? "Start a course" : "Add a course"}</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              {!learner && (
                <AddCard
                  eyebrow="Career tracks"
                  title="30 days for one role"
                  body="One real workplace problem a day, weekly checkpoints and interview prep for the job you want."
                  href="/tracks"
                  cta="Choose your track"
                />
              )}
              {!seat && (
                <AddCard
                  eyebrow="Course"
                  title="System Design"
                  body="Short daily lessons on your phone, built for system design interviews."
                  href="/system-design"
                  cta="See System Design"
                />
              )}
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
