import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Mic } from "lucide-react";
import { auth } from "@/auth";
import { Appear } from "@/components/motion/Appear";
import { CohortBoard, type BoardDay } from "@/components/learner/CohortBoard";
import { EvidenceProfile } from "@/components/learner/EvidenceProfile";
import { Achievements } from "@/components/learner/Achievements";
import { LearnerTopBar } from "@/components/learner/LearnerTopBar";
import { PaymentNotice } from "@/components/learner/PaymentNotice";
import { TodayCard } from "@/components/learner/TodayCard";
import { learnerButton } from "@/components/learner/learner-ui";
import { todayAction } from "@/lib/learner/today";
import { StudyBuddy } from "@/components/learner/StudyBuddy";
import { hasPaid } from "@/lib/access";
import { dayLockFor } from "@/lib/day-lock";
import { ProgressRing } from "@/components/learner/ProgressRing";
import { CourseOfflineCache } from "@/components/pwa/CourseOfflineCache";
import { contact } from "@/data/config";
import { getTrack, publicPath } from "@/data/tracks";
import { formatDate } from "@/lib/format";
import { topicsFor } from "@/lib/coach/topics";
import { requireLearner } from "@/lib/learner/data";
import { cohortDayDate, todayInIndia } from "@/lib/learn";
import { getCurriculum } from "@/data/curricula";

export const metadata: Metadata = { title: "My track", robots: { index: false, follow: false } };

/**
 * One track's own page: its calendar (30 days, or 60 for a challenge), progress, the voice coach and the
 * learner's evidence. The dashboard at /learn lists every course and links here.
 */
export default async function TrackHomePage({ params }: { params: Promise<{ slug: string }> }) {
  // Only the learner's own tracks have a page for them; not on this one (or on none): the dashboard explains.
  const state = await requireLearner((await params).slug);
  if (state.state === "not-enrolled") redirect("/learn");

  const { learner, submissions } = state;
  const home = `/learn/tracks/${learner.track}`;
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
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-red-deep">{track.name} track</p>
          <h1 className="display mt-4 text-4xl text-balance">Your place is reserved. Day 1 opens soon.</h1>
          <p className="mt-4 text-muted">
            The {track.name} course is being finished. We will email{" "}
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
  const canPractise = topicsFor(learner.track).length > 0;
  const doneDays = new Set(submissions.map((s) => s.day));
  const paid = track.price > 0 ? await hasPaid(learner.email, learner.track) : true;

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
    // Same rules as the day page: in order, and Days 2+ need a paid seat on a paid track.
    lock: ((l) => (l === "open" ? undefined : l))(dayLockFor({ day: d.day, price: track.price, paid, submittedDays: doneDays })),
  }));

  // What to do today, from the learner's own submissions. Once every day is
  // submitted there is no next day: the page says the track is complete.
  const action = todayAction({ days, submissions, price: track.price, paid, today: todayInIndia() });
  const todayDay = action.kind === "complete" ? null : days.find((d) => d.day === action.day) ?? null;
  const todayEntry = todayDay ? curriculum.days.find((d) => d.day === todayDay.day) ?? null : null;
  const focusDay = todayDay?.day ?? days[days.length - 1].day;
  // Streak: consecutive submitted days counting back from the latest one done.
  let streak = 0;
  for (let d = Math.max(0, ...doneDays); d >= 1 && doneDays.has(d); d--) streak++;
  const firstName = learner.name.split(" ")[0] || "there";
  const buddyMessage =
    action.kind === "complete" ? `All ${days.length} days done, ${firstName}. Proud of you.`
    : doneDays.size === 0 ? `Hi ${firstName}, I'm Kamran. Day 1 is ready when you are.`
    : action.kind === "paced" ? `That's today's limit, ${firstName}. Day ${action.day} is ready tomorrow.`
    : streak >= 3 ? `${streak} days in a row! Day ${action.day} next.`
    : `Welcome back, ${firstName}. Day ${action.day} is waiting.`;

  return (
    <>
      <LearnerTopBar name={learner.name} image={session?.user?.image} coach={canPractise ? `${home}/coach` : undefined} />
      <PaymentNotice email={learner.email} track={track} />

      {/* Deep red, lit from the top left and falling to near-black on the
          right; one soft glow drifts slowly behind the text. */}
      <div className="relative overflow-hidden bg-linear-to-br from-red via-red-press to-[#2a0204] text-white">
        <span aria-hidden="true" className="glow-drift pointer-events-none absolute -top-40 -left-24 size-[32rem] rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.14),transparent)]" />
        <div className="relative mx-auto max-w-[96rem] px-4 py-8 sm:px-8 sm:py-12">
          <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-6">
            <div>
              <Appear y={10} className="mb-5">
                <StudyBuddy message={buddyMessage} />
              </Appear>
              <Appear y={14}>
                <h1 className="display text-[clamp(1.75rem,4vw,2.75rem)] uppercase">{track.kind === "challenge" ? track.name : `${track.name} track`}</h1>
              </Appear>
              <Appear y={14} delay={0.08}>
                <p className="display mt-2 text-[clamp(1.1rem,2.2vw,1.65rem)] uppercase text-white/80">
                  Started {formatDate(learner.cohort_start)}
                </p>
              </Appear>
            </div>
            <Appear y={14} delay={0.12}>
              <ProgressRing done={doneDays.size} total={days.length} streak={streak} />
            </Appear>
          </div>

          <Appear y={14} delay={0.16} className="mt-8">
            <TodayCard
              action={action}
              day={todayEntry && { day: todayEntry.day, title: todayEntry.title, mission: todayEntry.mission, estimateMinutes: todayEntry.estimateMinutes, kind: todayEntry.kind }}
              total={days.length}
              base={home}
              canPractise={canPractise}
            />
          </Appear>
        </div>
      </div>

      <CourseOfflineCache days={days.length} home={home} />
      <div className="mx-auto max-w-[96rem] px-4 py-10 sm:px-8">
        <div id="your-days" className="scroll-mt-6">
          <Appear>
            <CohortBoard base={home} days={days} initialDay={focusDay} todayDay={todayDay?.day ?? null} />
          </Appear>
        </div>

        <Achievements days={days.filter((d) => d.submitted).length} total={days.length} name={learner.name} course={track.name} courseUrl={publicPath(track)} />

        {/* The spoken practice, where a learner will actually look for it:
            the course page they open every day, not a menu. */}
        {canPractise && (
          <Appear className="mt-12">
            <section className="flex flex-wrap items-center justify-between gap-5 rounded-card bg-night px-6 py-6 text-paper shadow-card">
              <div className="flex items-start gap-4">
                <span aria-hidden="true" className="mt-0.5 grid size-11 shrink-0 place-items-center rounded-full bg-white/10 text-red-soft">
                  <Mic className="size-5" />
                </span>
                <div>
                  <h2 className="display text-xl">Practise out loud, five minutes</h2>
                  <p className="mt-1 max-w-lg text-sm text-white/60">
                    The voice coach asks one question at a time on a single topic, and saves a short summary of what it heard.
                    Interviews are spoken: reading an answer is not practising it.
                  </p>
                </div>
              </div>
              <Link href={`${home}/coach`} className={learnerButton("onDark")}>
                Start a session
              </Link>
            </section>
          </Appear>
        )}

        <Appear className="mt-14">
          <section aria-labelledby="evidence">
            <EvidenceProfile
              track={learner.track}
              githubUsername={learner.github_username}
              linkedinSlug={learner.linkedin_slug}
              githubUrl={learner.github_url}
              linkedinUrl={learner.linkedin_url}
            />
          </section>
          <p className="mt-8 text-xs text-muted">
            Questions about your track? <Link href={`mailto:${contact.email}`} className="underline underline-offset-2 hover:text-ink">{contact.email}</Link>
          </p>
        </Appear>
      </div>
    </>
  );
}
