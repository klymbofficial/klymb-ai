import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { LearnerTopBar } from "@/components/learner/LearnerTopBar";
import { BuildSteps } from "@/components/learner/BuildSteps";
import { DaySubmission } from "@/components/learner/DaySubmission";
import { KnowledgeCheck } from "@/components/learner/KnowledgeCheck";
import { ModuleSidebar } from "@/components/learner/ModuleSidebar";
import { ResourceList } from "@/components/learner/ResourceList";
import { Appear } from "@/components/motion/Appear";
import { getPmDay, pmCurriculum } from "@/data/pm-curriculum";
import { contact } from "@/data/config";
import { LINKEDIN_POST_DAYS } from "@/lib/learner/evidence";
import { requireLearner } from "@/lib/learner/data";
import deskImage from "@/assets/day-desk.png";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * A titled block. `plain` drops the card so a section can sit directly on the
 * page, the way the design alternates between framed and unframed blocks.
 */
function Card({
  title, icon, plain, children, className = "",
}: { title: string; icon: string; plain?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <section className={`${plain ? "" : "rounded-card bg-card p-6 shadow-card"} ${className}`}>
      <h2 className="flex items-center gap-2.5 text-xl font-extrabold">
        <span aria-hidden="true" className="text-red">{icon}</span>
        {title}
      </h2>
      <div className={plain ? "mt-4" : "mt-5"}>{children}</div>
    </section>
  );
}

export default async function LearnDayPage({ params }: { params: Promise<{ day: string }> }) {
  const state = await requireLearner();
  if (state.state === "not-enrolled") notFound();
  const session = await auth();

  const dayNumber = Number((await params).day);
  const entry = getPmDay(dayNumber);
  if (!entry) notFound();

  const submission = state.submissions.find((s) => s.day === dayNumber) ?? null;
  const submittedDays = state.submissions.map((s) => s.day);
  const prev = pmCurriculum.find((d) => d.day === dayNumber - 1);
  const next = pmCurriculum.find((d) => d.day === dayNumber + 1);

  const kindLabel = entry.kind === "build" ? "Required" : entry.kind === "assessment" ? "Assessment" : "Mock interview";

  return (
    <>
      <LearnerTopBar name={state.learner.name} image={session?.user?.image} />

      <div className="mx-auto max-w-[96rem] px-4 py-6 sm:px-8">
      <div className="grid gap-6 lg:grid-cols-[280px_1fr] lg:items-start">
        <aside className="flex flex-col gap-5 lg:sticky lg:top-6">
          <div>
            <Link href="/learn" className="text-sm font-semibold text-muted hover:text-red-deep">← Back to dashboard</Link>
            <p className="display mt-3 text-2xl">Project Manager</p>
            <p className="mt-1 text-xs text-muted">
              Week {entry.week} · {Math.round((submittedDays.length / pmCurriculum.length) * 100)}% complete
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-red-strong"
                style={{ width: `${Math.max(2, Math.round((submittedDays.length / pmCurriculum.length) * 100))}%` }}
              />
            </div>
          </div>

          <ModuleSidebar currentDay={dayNumber} submitted={submittedDays} />

          <div className="rounded-card bg-card p-5 shadow-card">
            <p className="text-sm font-extrabold">Need help?</p>
            <p className="mt-1 text-xs text-muted">Reach out to our team any time.</p>
            <a href={`mailto:${contact.email}`} className="mt-3 inline-block rounded-md border border-line/50 px-3 py-2 text-xs font-bold hover:border-ink">
              Contact support →
            </a>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-6">
          <Appear>
            <div className="grid items-center gap-6 xl:grid-cols-[1.15fr_1fr]">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="display text-2xl text-red-strong">Day {entry.day}</p>
                  <span className="rounded-md bg-surface px-2.5 py-1 text-xs font-semibold text-muted">~{entry.estimateMinutes} min</span>
                  <span className="rounded-md border border-red-strong px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-red-deep">
                    {kindLabel}
                  </span>
                  <span className="rounded-md bg-surface px-2.5 py-1 text-xs font-semibold text-muted">{entry.points} pts</span>
                  {submission && (
                    <span className="rounded-md bg-ink px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-paper">Submitted</span>
                  )}
                </div>
                <h1 className="display mt-4 text-4xl text-balance sm:text-5xl">{entry.title}</h1>
              </div>
              <Image src={deskImage} alt="" aria-hidden="true" sizes="(min-width: 1280px) 34vw, 90vw" priority className="h-auto w-full" />
            </div>
          </Appear>

          {/* Two reading columns: what to do on the left, what to hand in on
              the right, as the design lays them out. */}
          <div className="grid gap-10 xl:grid-cols-2 xl:gap-12">
            <div className="flex min-w-0 flex-col gap-10">
              <Card title="Mission" icon="◎" plain>
                <p className="text-[15px] leading-relaxed">{entry.mission}</p>
                {entry.concepts.length > 0 && (
                  <>
                    <p className="mt-6 text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">Concepts to learn</p>
                    <ul className="mt-3 flex flex-col gap-2 text-sm">
                      {entry.concepts.map((c) => (
                        <li key={c} className="flex gap-2"><span aria-hidden="true" className="text-red">•</span>{c}</li>
                      ))}
                    </ul>
                  </>
                )}
              </Card>

              {entry.steps.length > 0 && (
                <Card title="Build steps" icon="⚒">
                  <BuildSteps steps={entry.steps} />
                </Card>
              )}

              {entry.quiz.length > 0 && (
                <Card title={entry.kind === "build" ? "Let's test your work" : "Challenge questions"} icon="✎" plain>
                  <KnowledgeCheck day={entry.day} questions={entry.quiz} saved={submission?.quiz_answers ?? null} />
                </Card>
              )}
            </div>

            <div className="flex min-w-0 flex-col gap-10">
              <Card title="Objectives" icon="☑" plain>
                <ul className="flex flex-col gap-2 text-sm">
                  {entry.objectives.map((o) => (
                    <li key={o} className="flex gap-2"><span aria-hidden="true" className="text-muted">•</span>{o}</li>
                  ))}
                </ul>
                <ul className="mt-5 flex flex-wrap gap-2">
                  {entry.tags.map((t) => (
                    <li key={t} className="rounded-md bg-surface px-2.5 py-1 text-[11px] font-bold">{t}</li>
                  ))}
                </ul>
              </Card>

              {entry.resources.length > 0 && (
                <Card title="Reference resources" icon="▤" plain>
                  <ResourceList resources={entry.resources} />
                </Card>
              )}

              <Card title="Your deliverable" icon="↥" plain>
                <p className="mb-5 text-sm">
                  <strong>Expected:</strong> <span dangerouslySetInnerHTML={{ __html: entry.deliverable }} />
                  <span className="mt-1.5 block text-muted"><strong className="text-ink">Reviewer checks:</strong> {entry.reviewerChecks}</span>
                </p>
                <DaySubmission
                  day={entry.day}
                  submission={submission}
                  needsLinkedinPost={LINKEDIN_POST_DAYS.includes(entry.day)}
                  nextDay={next?.day}
                />
              </Card>
            </div>
          </div>

          <nav aria-label="Other days" className="flex justify-between gap-4 border-t border-line/30 pt-5 font-bold">
            {prev ? <Link href={`/learn/day/${prev.day}`} className="hover:text-red-deep">← Day {prev.day}</Link> : <span />}
            {next ? <Link href={`/learn/day/${next.day}`} className="hover:text-red-deep">Day {next.day} →</Link> : <span />}
          </nav>
        </div>
      </div>
      </div>
    </>
  );
}
