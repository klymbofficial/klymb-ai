import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Award, Flame } from "lucide-react";
import { auth } from "@/auth";
import { AchievementPanel } from "@/components/dashboard/AchievementPanel";
import { DaySky, SkyGreeting } from "@/components/dashboard/DaySky";
import { ContinueCard, Faq, FirstCourseCard, LibraryRows, MILESTONE_ICONS, MilestoneCard, ProgressCard, StageHeader } from "@/components/dashboard/Panels";
import { StagePanel, StageProvider, StageRail, StageSwitch, type Stage } from "@/components/dashboard/StageTabs";
import { LearnerTopBar } from "@/components/learner/LearnerTopBar";
import { contact } from "@/data/config";
import { HACKATHON, hackathonPhase } from "@/data/hackathon";
import { myTeam, publishedResults } from "@/lib/hackathon";
import { loadDashboard, myLibraryCourses } from "@/lib/learner/dashboard";
import { getLearnerState, getLearnerTracks } from "@/lib/learner/data";
import { readProfile } from "@/lib/profile";
import { scoreProfile } from "@/lib/profile-score";
import { WEBINAR, webinarOpen } from "@/lib/webinar";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };

const BUILD_FAQ: [string, string][] = [
  ["When can I start a course?", "Any day. Day 1 opens as soon as you join, and your days run from there."],
  ["Can I take more than one course?", "Yes. Start another from the rows above or the Library. Each keeps its own days and progress, and this dashboard shows them all."],
  ["I missed a day. What now?", "Open the day you missed and submit it: days stay open and unlock in order. System Design is the exception: one lesson a day, and a missed day ends the refund."],
  ["Is a job guaranteed?", "No. Klymb doesn’t guarantee a job, placement or salary. The courses build practical ability, a portfolio and interview readiness; outcomes depend on you and the job market."],
];

const TEST_FAQ: [string, string][] = [
  ["How do the weekly quizzes work?", "Each 60-day challenge ends every week with a short multiple-choice quiz, on that week’s last day. Your best try is the one kept."],
  ["What do badges mean?", "Badges mark submitted work, not reviewer approval. Share any you’ve earned on LinkedIn from its course."],
  ["How does the hackathon work?", "Build for 48 hours, solo or in a team of up to three, from Friday kickoff to Sunday deadline. Submit a public GitHub repo, a live deployed URL and your AI-usage log before the deadline."],
  ["Are the live webinars free?", "Yes. Register, and the details come to your email."],
];

/**
 * The learner's dashboard, laid out like the main Klymb platform's: a greeting
 * under a sky that follows the time in India, two stages to switch between,
 * and under each the things to do. 01 Build skills: what to continue, the
 * streak and activity, and more to start. 02 Test skills: the weekly quiz,
 * the live webinar, the hackathon and the badges. Each ends with questions.
 */
export default async function DashboardPage() {
  const state = await getLearnerState();
  if (state.state === "signed-out") redirect("/learn/login");
  if (state.state === "other-device") redirect("/learn/login?error=device");
  // Rendered by the learner error page (retry), never mistaken for a missing enrolment.
  if (state.state === "unavailable") throw new Error("Learner data is unavailable");

  const session = await auth();
  const email = state.state === "enrolled" ? state.learner.email : state.email;
  const places = await getLearnerTracks();
  const [dash, { profile }, team, results] = await Promise.all([loadDashboard(email, places), readProfile(email, session?.user?.name), myTeam(email), publishedResults()]);
  const score = scoreProfile(profile, { hasPhoto: !!session?.user?.image });
  const name = places[0]?.learner.name || session?.user?.name || email.split("@")[0];
  const first = name.split(" ")[0];
  const { featured, courses, quiz } = dash;
  const others = courses.filter((c) => c !== featured);
  const earned = dash.badges.filter((b) => b.earned).length;
  const phase = hackathonPhase(results.length > 0);
  const { minute, today } = dash;

  // Streak for the greeting: consecutive India-time days with progress, up to today or yesterday.
  const days = new Set(Object.keys(dash.activity));
  let streak = 0;
  for (let t = Date.parse(`${today}T00:00:00Z`) - (days.has(today) ? 0 : 86_400_000); days.has(new Date(t).toISOString().slice(0, 10)); t -= 86_400_000) streak++;

  // 01: how far through everything. 02: the three things to prove it with.
  const done = courses.reduce((n, c) => n + c.done, 0);
  const total = courses.reduce((n, c) => n + c.total, 0);
  const tests = [quiz?.best != null, dash.webinarRegistered && webinarOpen(), !!team || dash.hackathonInterest];
  const stages: Stage[] = [
    { key: "build", anchor: "build-skills", number: "01", first: "Build", accent: "skills", pct: total ? Math.round((done / total) * 100) : 0, meta: total ? `${done} of ${total} steps` : "No course yet" },
    { key: "test", anchor: "test-skills", number: "02", first: "Test", accent: "skills", pct: Math.round((tests.filter(Boolean).length / tests.length) * 100), meta: `${tests.filter(Boolean).length} of ${tests.length} done` },
  ];

  const quizCard = !quiz
    ? { title: "Weekly quizzes", status: "They come with the 60-day challenges: one at the end of every week.", cta: { label: "See the challenges", href: "/challenges", solid: false }, done: false }
    : quiz.best
      ? { title: `${quiz.title}: week ${quiz.week}`, status: `Best try: ${quiz.best.score} of ${quiz.best.total}.`, cta: { label: "Try it again", href: quiz.href, solid: false }, done: true }
      : quiz.ready
        ? { title: `${quiz.title}: week ${quiz.week}`, status: "Ready now. It’s on the week’s last day.", cta: { label: `Take the week ${quiz.week} quiz`, href: quiz.href, solid: true }, done: false }
        : { title: `${quiz.title}: week ${quiz.week}`, status: `Opens when you finish week ${quiz.week}.`, cta: { label: "Open the challenge", href: quiz.href.replace(/\/day\/\d+$/, ""), solid: false }, done: false };
  const webinarCard = webinarOpen()
    ? { title: WEBINAR.title, status: `${WEBINAR.dateLabel}, ${WEBINAR.timeLabel}. ${dash.webinarRegistered ? "You’re registered." : "Live and free."}`, cta: dash.webinarRegistered ? { label: "See the details", href: "/webinar", solid: false } : { label: "Register free", href: "/webinar", solid: true }, done: dash.webinarRegistered }
    : { title: "Live webinars", status: "The next one will be announced here.", cta: null, done: false };
  const hackathonCard = team
    ? { title: HACKATHON.name, status: phase === "live" && !team.entry ? `The build is on. Submit by ${HACKATHON.deadlineLabel}.` : `You’re in${team.name ? ` with ${team.name}` : ""}.`, cta: { label: phase === "live" && !team.entry ? "Submit your entry" : "Go to your team", href: "/learn/hackathon", solid: phase === "live" && !team.entry }, done: true }
    : phase === "coming-soon"
      ? { title: HACKATHON.name, status: dash.hackathonInterest ? "Dates are coming soon. We’ll tell you when registration opens." : "48 hours, solo or a team of up to three. Dates are coming soon.", cta: dash.hackathonInterest ? null : { label: "Get notified", href: "/hackathons", solid: true }, done: dash.hackathonInterest }
      : { title: HACKATHON.name, status: phase === "registration" ? "Registration is open: solo or a team of up to three." : "See what’s happening.", cta: { label: phase === "registration" ? "Register" : "See the hackathon", href: "/hackathons", solid: phase === "registration" }, done: false };

  return (
    <>
      <LearnerTopBar name={name} image={session?.user?.image} />
      <main id="dashboard">
        <h1 className="sr-only">Dashboard</h1>
        <StageProvider stages={stages} current={stages[0].pct >= 100 && total ? "test" : "build"}>
          <DaySky minute={minute} today={today}>
            <div className="mx-auto w-full max-w-[1280px] px-4 pt-5 pb-24 sm:px-8 sm:pt-12 sm:pb-14 lg:px-10">
              {/* data-sky-text: the sky keeps the sun and moon below this on phones. */}
              <div data-sky-text="" className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 sm:gap-y-4">
                <div>
                  <p className="display dsky-ink text-[1.65rem] sm:text-[clamp(1.9rem,4vw,2.75rem)]">
                    <SkyGreeting />, <span className="dsky-accent">{first}</span>
                  </p>
                  <p className="dsky-ink-soft mt-2 hidden text-[15px] sm:block">
                    {featured ? `${courses.length} ${courses.length === 1 ? "course" : "courses"} on the go. Here’s what’s next.` : "Let’s start your first course."}
                  </p>
                </div>
                <ul aria-label="Your numbers" className="flex flex-wrap gap-2">
                  <li className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-white/80 bg-white px-3 text-xs font-bold text-ink shadow-[0_4px_14px_-8px_rgba(0,0,0,0.25)] sm:min-h-10 sm:gap-2 sm:px-4 sm:text-sm">
                    <Flame aria-hidden="true" className="size-4 text-red-deep" strokeWidth={2.2} />{streak}-day streak
                  </li>
                  <li className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-white/80 bg-white px-3 text-xs font-bold text-ink shadow-[0_4px_14px_-8px_rgba(0,0,0,0.25)] sm:min-h-10 sm:gap-2 sm:px-4 sm:text-sm">
                    <Award aria-hidden="true" className="size-4 text-red-deep" strokeWidth={2.2} />{earned} {earned === 1 ? "badge" : "badges"}
                  </li>
                </ul>
              </div>
              <div className="mt-8 hidden sm:block"><StageRail /></div>
            </div>
          </DaySky>
          {/* Phones: the stages as one slim switch, half over the sky, that stays at the top while the page scrolls. */}
          <div className="sticky top-2 z-30 -mt-10 px-3 sm:hidden"><StageSwitch /></div>

          <div className="mx-auto w-full max-w-[1280px] px-4 pt-7 pb-20 sm:px-8 sm:pt-10 lg:px-10">
            <StagePanel stage="build">
              <div className="flex flex-col gap-10">
                <StageHeader
                  title="Learn by"
                  accent="doing."
                  sub="Pick up where you left off, keep the streak, and start something new."
                  aside={<Link href="#test-skills" className="inline-flex min-h-11 items-center gap-1 text-sm font-bold hover:text-red-deep">Next: Test skills →</Link>}
                />
                <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                  {featured ? <ContinueCard featured={featured} others={others} /> : <FirstCourseCard email={email} contactEmail={contact.email} />}
                  <div className="flex flex-col gap-5">
                    <ProgressCard activity={dash.activity} today={today} />
                    {!score.ready && (
                      <section aria-labelledby="profile-title" className="card p-5 sm:p-6">
                        <div className="flex items-baseline justify-between gap-3">
                          <h3 id="profile-title" className="font-bold">Your profile</h3>
                          <span className="text-sm font-bold nums">{score.score}%</span>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink/10"><div className="h-full rounded-full bg-red" style={{ width: `${Math.max(2, score.score)}%` }} /></div>
                        {score.missing[0] && <p className="mt-2 text-sm text-muted">Next: {score.missing[0]}</p>}
                        <Link href="/learn/profile" className="mt-2 inline-flex min-h-11 items-center text-sm font-bold underline underline-offset-4 hover:text-red-deep">Complete your profile</Link>
                      </section>
                    )}
                  </div>
                </div>
                <LibraryRows mine={myLibraryCourses(courses)} />
                <Faq id="build-faq" items={BUILD_FAQ} />
              </div>
            </StagePanel>

            <StagePanel stage="test">
              <div className="flex flex-col gap-10">
                <StageHeader
                  title="Prove what you’ve"
                  accent="learned."
                  sub="The weekly quiz, live events, the hackathon, and every badge you’ve earned."
                  aside={<Link href="#build-skills" className="inline-flex min-h-11 items-center gap-1 text-sm font-bold hover:text-red-deep">← Build skills</Link>}
                />
                <div className="grid grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  <MilestoneCard icon={MILESTONE_ICONS.quiz} kicker="Weekly quiz" {...quizCard} />
                  <MilestoneCard icon={MILESTONE_ICONS.webinar} kicker="Live webinar" {...webinarCard} />
                  <MilestoneCard icon={MILESTONE_ICONS.hackathon} kicker="Hackathon · 48 hours" {...hackathonCard} />
                </div>
                <AchievementPanel initial={dash.badges} titles={dash.titles} featured={featured?.key ?? null} sd={dash.sd} />
                <Faq id="test-faq" items={TEST_FAQ} />
              </div>
            </StagePanel>
          </div>
        </StageProvider>
      </main>
    </>
  );
}
