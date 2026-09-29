import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft, ArrowRight, BookOpen, ChevronRight, CircleHelp, CloudUpload, Pencil, SquareCheck, Target, Toolbox,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { auth } from "@/auth";
import { LearnerTopBar } from "@/components/learner/LearnerTopBar";
import { BuildSteps } from "@/components/learner/BuildSteps";
import { DaySubmission } from "@/components/learner/DaySubmission";
import { KnowledgeCheck } from "@/components/learner/KnowledgeCheck";
import { ModuleSidebar } from "@/components/learner/ModuleSidebar";
import { ResourceList } from "@/components/learner/ResourceList";
import { Appear } from "@/components/motion/Appear";
import { getPmDay, pmCurriculum, pmModules } from "@/data/pm-curriculum";
import { contact } from "@/data/config";
import { getTrack } from "@/data/tracks";
import { LINKEDIN_POST_DAYS } from "@/lib/learner/evidence";
import { requireLearner } from "@/lib/learner/data";
import deskImage from "@/assets/day-desk.png";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * A titled block: red line icon, heading, then its content. It rises into
 * place as it scrolls into view; `delay` staggers the right-hand column a
 * beat behind the left so each row settles left to right.
 */
function Section({
  title, icon: Icon, children, delay = 0,
}: { title: string; icon: LucideIcon; children: React.ReactNode; delay?: number }) {
  return (
    <Appear delay={delay} y={12} className="flex flex-col">
      <section className="flex flex-1 flex-col">
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

export default async function LearnDayPage({ params }: { params: Promise<{ day: string }> }) {
  const state = await requireLearner();
  if (state.state === "not-enrolled") notFound();
  // Day pages are the Project Manager course; other tracks wait on the dashboard.
  if (!getTrack(state.learner.track)?.contentLive) redirect("/learn");
  const session = await auth();

  const dayNumber = Number((await params).day);
  const entry = getPmDay(dayNumber);
  if (!entry) notFound();

  const submission = state.submissions.find((s) => s.day === dayNumber) ?? null;
  const submittedDays = state.submissions.map((s) => s.day);
  const next = pmCurriculum.find((d) => d.day === dayNumber + 1);
  const percent = Math.round((submittedDays.length / pmCurriculum.length) * 100);

  const modules = pmModules.map((m) => ({
    week: m.week,
    name: m.name,
    days: pmCurriculum.filter((d) => d.week === m.week).map((d) => ({ day: d.day, title: d.title })),
  }));

  const kindLabel = entry.kind === "build" ? "Required" : entry.kind === "assessment" ? "Assessment" : "Mock interview";

  return (
    <div className="bg-card">
      <LearnerTopBar name={state.learner.name} image={session?.user?.image} />

      <div className="grid lg:grid-cols-[322px_1fr]">
        <aside className="border-line/25 bg-paper px-6 pt-4 pb-8 lg:border-r">
          <div className="lg:sticky lg:top-4">
            <Link href="/learn" className="group inline-flex items-center gap-1.5 text-sm font-medium text-ink/80 underline underline-offset-4 transition-colors hover:text-red-deep">
              <ArrowLeft aria-hidden="true" className="size-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" /> Back to Dashboard
            </Link>
            <p className="mt-5 font-heading text-2xl font-bold">Project Manager</p>
            <p className="mt-1 text-sm text-muted">Week {entry.week} - {percent}% complete</p>
            <div className="mt-2 mb-6 h-1 overflow-hidden rounded-full bg-line/20">
              <div className="grow-x h-full rounded-full bg-red-strong" style={{ width: `${Math.max(2, percent)}%` }} />
            </div>

            <ModuleSidebar modules={modules} currentDay={dayNumber} submitted={submittedDays} />

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

        <main className="min-w-0 px-4 py-10 sm:px-10 xl:px-16">
          <div className="grid items-center gap-8 xl:grid-cols-[1.15fr_1fr]">
              <div className="relative z-10">
                <Appear y={8} className="flex flex-wrap items-center gap-3">
                  <p className="mr-8 font-heading text-4xl font-semibold tracking-tight text-red-strong">Day {entry.day}</p>
                  <span className="rounded-md bg-surface px-2.5 py-1 text-xs font-semibold text-ink/80">~{entry.estimateMinutes} min</span>
                  <span className="rounded-md border border-red-strong px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-red-deep">
                    {kindLabel}
                  </span>
                  {submission && (
                    <span className="rounded-md bg-ink px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-paper">Submitted</span>
                  )}
                </Appear>
                <Appear delay={0.08} y={18}>
                  <h1 className="display mt-10 text-4xl text-balance sm:text-5xl">{entry.title}</h1>
                </Appear>
              </div>
              <Appear delay={0.16} y={0} className="relative">
                {/* A slow drift, a few pixels, so the still life feels lit rather than pasted. */}
                <div className="float-soft">
                  <Image src={deskImage} alt="" aria-hidden="true" sizes="(min-width: 1280px) 40vw, 90vw" priority className="h-auto w-full xl:origin-right xl:scale-[1.18]" />
                </div>
                {next && (
                  <Link
                    href={`/learn/day/${next.day}`}
                    className="group absolute top-2 right-0 inline-flex items-center gap-1.5 rounded-md bg-red-strong px-4 py-2 text-sm font-bold text-white shadow-sm transition-[background-color,box-shadow] duration-200 hover:bg-red-press hover:shadow-card"
                  >
                    Day {next.day} <ChevronRight aria-hidden="true" className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Link>
                )}
              </Appear>
            </div>

          {/* Six blocks in three rows, so each pair lines up across the two
              columns as the design lays them out. */}
          <div className="mt-12 grid gap-x-16 gap-y-16 xl:grid-cols-2">
            <Section title="Mission" icon={Target}>
              <p className="text-base leading-relaxed text-muted">{entry.mission}</p>
              {entry.concepts.length > 0 && (
                <>
                  <p className="mt-6 text-sm font-semibold uppercase tracking-[0.02em] text-muted/80">Concepts to learn</p>
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

            <Section title="Your deliverable" icon={CloudUpload} delay={RIGHT}>
              <dl className="mb-8 flex flex-col gap-4 rounded-lg bg-surface/50 p-4 text-[15px] leading-relaxed">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-widest text-muted">Expected</dt>
                  <dd className="mt-1" dangerouslySetInnerHTML={{ __html: entry.deliverable }} />
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-widest text-muted">Reviewer checks</dt>
                  <dd className="mt-1">{entry.reviewerChecks}</dd>
                </div>
              </dl>
              <DaySubmission
                day={entry.day}
                submission={submission}
                needsLinkedinPost={LINKEDIN_POST_DAYS.includes(entry.day)}
                nextDay={next?.day}
              />
            </Section>
          </div>
        </main>
      </div>
    </div>
  );
}
