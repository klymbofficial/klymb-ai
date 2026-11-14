import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft, ArrowRight, BookOpen, CircleHelp, CloudUpload, Pencil, SquareCheck, Target, Toolbox,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { auth } from "@/auth";
import { LearnerTopBar } from "@/components/learner/LearnerTopBar";
import { ContentGuard } from "@/components/learner/ContentGuard";
import { checkRateLimit } from "@/lib/rate-limit";
import { BuildSteps } from "@/components/learner/BuildSteps";
import { DaySubmission } from "@/components/learner/DaySubmission";
import { DayStatus } from "@/components/learner/DayStatus";
import { topicsFor } from "@/lib/coach/topics";
import { KnowledgeCheck } from "@/components/learner/KnowledgeCheck";
import { ModuleSidebar } from "@/components/learner/ModuleSidebar";
import { ResourceList } from "@/components/learner/ResourceList";
import { Appear } from "@/components/motion/Appear";
import { getCurriculum } from "@/data/curricula";
import { contact } from "@/data/config";
import { allTracks, getTrack } from "@/data/tracks";
import { getAdmin } from "@/lib/admin/auth";
import { LINKEDIN_POST_DAYS } from "@/lib/learner/evidence";
import { Markdown } from "@/components/ui/Markdown";
import { WeeklyQuiz } from "@/components/learner/WeeklyQuiz";
import { bestQuizScores, publicQuiz } from "@/lib/challenge-quiz";
import { requireLearner, type Submission } from "@/lib/learner/data";
import { dayLock } from "@/lib/access";
import { DayLocked, DayPaywall } from "@/components/learner/DayPaywall";
import deskImage from "@/assets/day-desk.png";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * A titled block: red line icon, heading, then its content. It rises into
 * place as it scrolls into view; `delay` staggers the right-hand column a
 * beat behind the left so each row settles left to right.
 */
function Section({
  title, icon: Icon, children, delay = 0, id,
}: { title: string; icon: LucideIcon; children: React.ReactNode; delay?: number; /** An anchor the status strip links to. */ id?: string }) {
  return (
    <Appear delay={delay} y={12} className="flex flex-col">
      <section id={id} className="flex flex-1 scroll-mt-6 flex-col">
        <h2 className="flex items-center gap-2.5 text-lg font-bold">
          <Icon aria-hidden="true" className="size-5 shrink-0 text-red" strokeWidth={2} />
          {title}
        </h2>
        {/* Fills the row, so the forms can pin their buttons to one shared baseline. */}
        <div className="mt-5 flex flex-1 flex-col">{children}</div>
      </section>
    </Appear>
  );
}

const RIGHT = 0.08;

export default async function LearnDayPage({
  params, searchParams,
}: { params: Promise<{ slug: string; day: string }>; searchParams: Promise<{ preview?: string }> }) {
  const { slug, day } = await params;
  // Admin preview: ?preview=1 opens any track's days, all unlocked and read-only.
  const admin = (await searchParams).preview === "1" ? await getAdmin() : null;
  const preview = admin && getTrack(slug)?.contentLive && getCurriculum(slug) ? slug : null;

  let viewer: { id: string; name: string; email: string; track: string; submissions: Submission[] };
  if (preview && admin) {
    viewer = { id: "preview", name: admin.name ?? "Admin", email: admin.email, track: preview, submissions: [] };
  } else {
    const state = await requireLearner(slug);
    // Not on this track (or on none): the dashboard explains, a 404 would not.
    if (state.state === "not-enrolled") redirect("/learn");
    viewer = { ...state.learner, submissions: state.submissions };
  }
  const q = preview ? "?preview=1" : "";
  const base = `/learn/tracks/${viewer.track}`;

  // Each track's own 30 days; a track without a built course waits on the dashboard.
  const curriculum = getCurriculum(viewer.track);
  if (!getTrack(viewer.track)?.contentLive || !curriculum) redirect("/learn");
  const { days: courseDays, modules: courseModules } = curriculum;
  const session = await auth();
  const coach = topicsFor(viewer.track).length > 0 ? `${base}/coach` : undefined;

  const dayNumber = Number(day);
  const entry = courseDays.find((d) => d.day === dayNumber);
  if (!entry) notFound();

  const track = getTrack(viewer.track)!;
  const lock = preview ? "open" : await dayLock({ email: viewer.email, track: track.slug, price: track.price, day: dayNumber, submittedDays: viewer.submissions.map((x) => x.day) });
  if (lock === "previous") {
    const prev = courseDays.find((d) => d.day === dayNumber - 1);
    return (
      <div className="min-h-screen bg-card">
        <LearnerTopBar name={viewer.name} image={session?.user?.image} coach={coach} />
        <DayLocked base={base} day={dayNumber} title={entry.title} previousDay={dayNumber - 1} previousTitle={prev?.title ?? ""} />
      </div>
    );
  }
  if (lock === "pay") {
    return (
      <div className="min-h-screen bg-card">
        <LearnerTopBar name={viewer.name} image={session?.user?.image} coach={coach} />
        <DayPaywall email={viewer.email} track={track} day={dayNumber} title={entry.title} />
      </div>
    );
  }

  // Scraping guard: a person reads a few day pages an hour; a script reads hundreds.
  const views = preview ? { allowed: true } : await checkRateLimit("day_view", { limit: 60, windowMinutes: 60, identity: viewer.id });
  if (!views.allowed) {
    console.warn("day_view limit hit:", viewer.email);
    return (
      <div className="min-h-screen bg-card">
        <LearnerTopBar name={viewer.name} image={session?.user?.image} coach={coach} />
        <div className="mx-auto max-w-md px-6 py-24 text-center">
          <h1 className="display text-3xl">Take a short break</h1>
          <p className="mt-3 text-muted">You&apos;ve opened a lot of course pages in the last hour. Come back in a little while and everything will be here.</p>
        </div>
      </div>
    );
  }

  const submission = viewer.submissions.find((s) => s.day === dayNumber) ?? null;
  const submittedDays = viewer.submissions.map((s) => s.day);
  const next = courseDays.find((d) => d.day === dayNumber + 1);
  const percent = Math.round((submittedDays.length / courseDays.length) * 100);

  const modules = courseModules.map((m) => ({
    week: m.week,
    name: m.name,
    days: courseDays.filter((d) => d.week === m.week).map((d) => ({ day: d.day, title: d.title })),
  }));

  const kindLabel = entry.kind === "build" ? "Required" : entry.kind === "assessment" ? "Assessment" : "Interview prep";
  const isChallenge = track.kind === "challenge";
  // A challenge's weekly quiz sits on the last day of its week.
  const lastOfWeek = entry.day === Math.max(...courseDays.filter((d) => d.week === entry.week).map((d) => d.day));
  const quiz = isChallenge && lastOfWeek ? publicQuiz(track.slug, entry.week) : undefined;
  const best = quiz && !preview ? (await bestQuizScores(viewer.id))[entry.week] : undefined;

  return (
    <div className="bg-card">
      <LearnerTopBar name={viewer.name} image={session?.user?.image} coach={coach} />
      {preview && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line/30 bg-ink px-6 py-2.5 text-sm text-white">
          <span className="font-bold">Admin preview · read-only</span>
          {allTracks.filter((t) => t.contentLive).map((t) => (
            <Link key={t.slug} href={`/learn/tracks/${t.slug}/day/${dayNumber}?preview=1`} className={t.slug === preview ? "font-bold underline underline-offset-4" : "text-white/70 hover:text-white"}>
              {t.name}
            </Link>
          ))}
          <Link href="/admin/courses" className="ml-auto text-white/70 hover:text-white">All courses</Link>
        </div>
      )}

      <div className="grid lg:grid-cols-[322px_1fr]">
        <aside className="order-2 border-t border-line/25 bg-paper px-6 pt-4 pb-8 lg:order-1 lg:border-t-0 lg:border-r">
          <div className="lg:sticky lg:top-4">
            <Link href={preview ? "/admin/courses" : base} className="group inline-flex items-center gap-1.5 text-sm font-medium text-ink/80 underline underline-offset-4 transition-colors hover:text-red-deep">
              <ArrowLeft aria-hidden="true" className="size-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" /> Back to track
            </Link>
            <p className="mt-5 font-heading text-2xl font-bold">{getTrack(viewer.track)?.name}</p>
            <p className="mt-1 text-sm text-muted">Week {entry.week} - {percent}% complete</p>
            <div className="mt-2 mb-6 h-1 overflow-hidden rounded-full bg-line/20">
              <div className="grow-x h-full rounded-full bg-red-strong" style={{ width: `${Math.max(2, percent)}%` }} />
            </div>

            <ModuleSidebar modules={modules} currentDay={dayNumber} submitted={submittedDays} base={base} query={q} />

            <div className="mt-6 rounded-lg border border-line/25 bg-card p-4">
              <div className="flex gap-3">
                <CircleHelp aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-red" />
                <div>
                  <p className="font-bold">Need help?</p>
                  <p className="text-sm text-muted">Reach out to our team anytime.</p>
                </div>
              </div>
              <a
                href={`mailto:${contact.email}`}
                className="group mt-3 flex items-center justify-center gap-1.5 rounded-md border border-line/40 py-2 text-[15px] font-bold transition-colors duration-200 hover:border-ink hover:bg-paper"
              >
                Contact Support <ArrowRight aria-hidden="true" className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </a>
            </div>
          </div>
        </aside>

        <main className="order-1 min-w-0 px-4 py-6 sm:px-10 sm:py-10 lg:order-2 xl:px-16"><ContentGuard email={viewer.email}>
          {/* The sidebar below the content on phones, so the day comes first: its way back is here. */}
          <div className="mb-6 lg:hidden">
            <Link href={preview ? "/admin/courses" : base} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold underline underline-offset-4 hover:text-red-deep">
              <ArrowLeft aria-hidden="true" className="size-3.5" /> Back to track
            </Link>
            <p className="text-sm text-muted">Day {entry.day} of {courseDays.length} · Week {entry.week} · {percent}% complete</p>
          </div>
          <div className="grid items-center gap-8 xl:grid-cols-[1.15fr_1fr]">
              <div className="relative z-10">
                <Appear y={8} className="flex flex-wrap items-center gap-3">
                  <p className="mr-4 font-heading text-3xl font-semibold tracking-tight text-red-strong sm:mr-8 sm:text-4xl">Day {entry.day}</p>
                  <span className="rounded-md bg-surface px-2.5 py-1 text-xs font-semibold text-ink/80">~{entry.estimateMinutes} min</span>
                  <span className="rounded-md border border-red-strong px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-red-deep">
                    {kindLabel}
                  </span>
                  {submission && (
                    <span className="rounded-md bg-ink px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-paper">Submitted</span>
                  )}
                </Appear>
                <Appear delay={0.08} y={18}>
                  <h1 className="display mt-6 text-3xl text-balance sm:mt-10 sm:text-5xl">{entry.title}</h1>
                </Appear>
              </div>
              <Appear delay={0.16} y={0} className="relative hidden xl:block">
                {/* A slow drift, a few pixels, so the still life feels lit rather than pasted. */}
                <div className="float-soft">
                  <Image src={deskImage} alt="" aria-hidden="true" sizes="40vw" priority className="h-auto w-full origin-right scale-[1.18]" />
                </div>
              </Appear>
            </div>

          {!preview && (
            <div className="mt-8">
              <DayStatus
                day={entry.day}
                submittedAt={submission?.submitted_at ?? null}
                next={next ? { day: next.day, title: next.title } : null}
                base={base}
              />
            </div>
          )}

          {/* Six blocks in three rows, so each pair lines up across the two
              columns as the design lays them out. */}
          <div className="mt-10 grid gap-x-16 gap-y-12 sm:mt-12 sm:gap-y-16 xl:grid-cols-2">
            <Section title={entry.brief ? "Today's task" : "Mission"} icon={Target}>
              {entry.mission && <p className="text-base leading-relaxed text-muted">{entry.mission}</p>}
              {entry.brief && <Markdown text={entry.brief} className={`text-[15px] leading-relaxed text-ink/85 ${entry.mission ? "mt-4" : ""}`} />}
              {entry.concepts.length > 0 && (
                <>
                  <p className="mt-6 text-sm font-semibold uppercase tracking-[0.02em] text-muted">Concepts to learn</p>
                  <ul className="mt-3 flex flex-col gap-2.5 text-[15px]">
                    {entry.concepts.map((c) => <li key={c}>• {c}</li>)}
                  </ul>
                </>
              )}
            </Section>

            <Section title="Objectives" icon={SquareCheck} delay={RIGHT}>
              <ul className="flex flex-col gap-2.5 text-[15px]">
                {entry.objectives.map((o) => <li key={o}>• {o}</li>)}
              </ul>
              <ul className="mt-6 flex flex-wrap gap-2">
                {entry.tags.map((t) => (
                  <li key={t} className="rounded-md bg-surface/70 px-3 py-1.5 text-[15px] font-medium text-ink/80">{t}</li>
                ))}
              </ul>
            </Section>

            {entry.steps.length > 0 ? (
              <Appear y={12} className="flex flex-col"><section className="flex flex-1 flex-col rounded-2xl border border-line/20 bg-linear-to-b from-red-tint/60 to-card to-40% p-7 shadow-card transition-shadow duration-300 hover:shadow-float">
                <h2 className="flex items-center gap-2.5 text-lg font-bold">
                  <Toolbox aria-hidden="true" className="size-5 shrink-0 text-red" strokeWidth={2} />
                  Build steps
                </h2>
                <div className="mt-6 flex flex-1 flex-col"><BuildSteps steps={entry.steps} /></div>
              </section></Appear>
            ) : <div className="hidden xl:block" />}

            {entry.resources.length > 0 ? (
              <Section title="Reference resources" icon={BookOpen} delay={RIGHT}>
                <ResourceList resources={entry.resources} />
              </Section>
            ) : <div className="hidden xl:block" />}

            {entry.quiz.length > 0 ? (
              <Section title={entry.kind === "build" ? "Let's test your work" : "Challenge questions"} icon={Pencil}>
                <KnowledgeCheck day={entry.day} questions={entry.quiz} saved={submission?.quiz_answers ?? null} />
              </Section>
            ) : <div className="hidden xl:block" />}

            <Section id="submit" title="Your deliverable" icon={CloudUpload} delay={RIGHT}>
              <dl className="mb-8 flex flex-col gap-4 rounded-lg bg-surface/50 p-4 text-[15px] leading-relaxed">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-widest text-muted">Expected</dt>
                  <dd className="mt-1" dangerouslySetInnerHTML={{ __html: entry.deliverable }} />
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-widest text-muted">Done when</dt>
                  <dd className="mt-1">{entry.reviewerChecks}</dd>
                </div>
              </dl>
              {preview ? (
                <p className="rounded-lg bg-surface p-4 text-sm text-muted">Preview: submitting is turned off. Learners submit their link and answers here.</p>
              ) : (
              <DaySubmission
                day={entry.day}
                submission={submission}
                needsLinkedinPost={isChallenge || LINKEDIN_POST_DAYS.includes(entry.day)}
                nextDay={next?.day}
                trackSlug={viewer.track}
              />
              )}
            </Section>
          </div>

          {/* A challenge day's extras: the prompt to paste, the tool, the walkthrough, the post. */}
          {(entry.prompt || entry.tool || entry.video || entry.linkedinTemplate) && (
            <div className="mt-16 grid gap-x-16 gap-y-12 xl:grid-cols-2">
              {entry.prompt && (
                <Section title="The prompt" icon={Pencil}>
                  <pre className="max-h-[28rem] overflow-auto rounded-lg bg-surface/60 p-4 text-sm leading-relaxed whitespace-pre-wrap">{entry.prompt}</pre>
                </Section>
              )}
              {(entry.tool || entry.video) && (
                <Section title="Tools for today" icon={Toolbox} delay={RIGHT}>
                  {entry.tool && (
                    <div>
                      <p className="font-bold">{entry.tool.url ? <a href={entry.tool.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{entry.tool.name}</a> : entry.tool.name}</p>
                      <p className="mt-1 text-[15px] text-muted">{entry.tool.description}</p>
                    </div>
                  )}
                  {entry.video && (
                    <a href={entry.video} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1.5 text-[15px] font-bold underline underline-offset-4 ${entry.tool ? "mt-5" : ""}`}>
                      Watch the walkthrough<span aria-hidden="true"> ↗</span>
                    </a>
                  )}
                </Section>
              )}
              {entry.linkedinTemplate && (
                <Section title="Your LinkedIn post" icon={CloudUpload}>
                  {entry.post && <p className="mb-3 text-[15px] text-muted">{entry.post}</p>}
                  <p className="mb-2 text-sm text-muted">A starting point: make it yours, then paste the link to the post with your submission.</p>
                  <pre className="max-h-[22rem] overflow-auto rounded-lg bg-surface/60 p-4 text-sm leading-relaxed whitespace-pre-wrap">{entry.linkedinTemplate}</pre>
                </Section>
              )}
            </div>
          )}

          {quiz && (
            <div className="mt-16">
              <Section title="Weekly quiz" icon={SquareCheck}>
                {preview && <p className="mb-5 rounded-lg bg-surface p-4 text-sm text-muted">Preview: submitting is refused, since you are not on this challenge.</p>}
                <WeeklyQuiz track={track.slug} quiz={quiz} best={best} />
              </Section>
            </div>
          )}
        </ContentGuard></main>
      </div>
    </div>
  );
}
