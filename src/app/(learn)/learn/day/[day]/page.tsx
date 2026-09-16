import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { signOutLearner } from "../../actions";
import { BuildSteps } from "@/components/learner/BuildSteps";
import { DaySubmission } from "@/components/learner/DaySubmission";
import { KnowledgeCheck } from "@/components/learner/KnowledgeCheck";
import { ModuleSidebar } from "@/components/learner/ModuleSidebar";
import { ResourceList } from "@/components/learner/ResourceList";
import { Appear } from "@/components/motion/Appear";
import { Wordmark } from "@/components/layout/Wordmark";
import { getPmDay, pmCurriculum } from "@/data/pm-curriculum";
import { LINKEDIN_POST_DAYS } from "@/lib/learner/evidence";
import { requireLearner } from "@/lib/learner/data";

export const metadata: Metadata = { robots: { index: false, follow: false } };

function Card({ title, icon, children, className = "" }: { title: string; icon: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`border-2 border-line bg-paper ${className}`}>
      <h2 className="flex items-center gap-2 border-b-2 border-line px-5 py-3 text-sm font-extrabold">
        <span aria-hidden="true" className="text-red">{icon}</span>
        {title}
      </h2>
      <div className="p-5">{children}</div>
    </section>
  );
}

export default async function LearnDayPage({ params }: { params: Promise<{ day: string }> }) {
  const state = await requireLearner();
  if (state.state === "not-enrolled") notFound();

  const dayNumber = Number((await params).day);
  const entry = getPmDay(dayNumber);
  if (!entry) notFound();

  const submission = state.submissions.find((s) => s.day === dayNumber) ?? null;
  const submittedDays = state.submissions.map((s) => s.day);
  const prev = pmCurriculum.find((d) => d.day === dayNumber - 1);
  const next = pmCurriculum.find((d) => d.day === dayNumber + 1);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link href="/learn" className="flex items-baseline gap-3">
          <Wordmark className="text-xl" />
          <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted">Project Manager</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/learn" className="font-bold underline underline-offset-4 hover:text-red-deep">Dashboard</Link>
          <form action={signOutLearner}>
            <button type="submit" className="border border-line px-3 py-1.5 text-xs font-bold uppercase tracking-wider hover:border-ink">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr] lg:items-start">
        <aside className="lg:sticky lg:top-6">
          <ModuleSidebar currentDay={dayNumber} submitted={submittedDays} />
        </aside>

        <div className="flex min-w-0 flex-col gap-6">
          <Appear>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-red-deep">Day {entry.day}</p>
            <h1 className="display mt-2 text-4xl text-balance sm:text-5xl">{entry.title}</h1>
            <ul className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
              <li className="border-2 border-line px-2.5 py-1">{entry.points} pts</li>
              <li className="border-2 border-line px-2.5 py-1">~{entry.estimateMinutes} min</li>
              <li className="border-2 border-red-deep bg-red-tint px-2.5 py-1 text-red-deep uppercase tracking-wider">
                {entry.kind === "build" ? "Required" : entry.kind === "assessment" ? "Assessment" : "Mock interview"}
              </li>
              {submission && <li className="border-2 border-ink bg-ink px-2.5 py-1 text-paper uppercase tracking-wider">Submitted</li>}
            </ul>
          </Appear>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card title="Mission" icon="◎">
              <p className="font-bold">{entry.title}</p>
              <p className="mt-2 text-muted">{entry.mission}</p>
              {entry.concepts.length > 0 && (
                <>
                  <p className="mt-5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">Concepts to learn</p>
                  <ul className="mt-2 flex flex-col gap-1.5 text-sm">
                    {entry.concepts.map((c) => (
                      <li key={c} className="flex gap-2"><span aria-hidden="true" className="text-red">•</span>{c}</li>
                    ))}
                  </ul>
                </>
              )}
            </Card>

            <Card title="Objectives" icon="☑">
              <ul className="flex flex-col gap-2 text-sm">
                {entry.objectives.map((o) => (
                  <li key={o} className="flex gap-2"><span aria-hidden="true" className="text-muted">–</span>{o}</li>
                ))}
              </ul>
              <ul className="mt-5 flex flex-wrap gap-1.5">
                {entry.tags.map((t) => (
                  <li key={t} className="bg-surface px-2 py-1 text-[11px] font-bold">{t}</li>
                ))}
              </ul>
            </Card>
          </div>

          {entry.steps.length > 0 && (
            <Card title="Build steps" icon="⚒">
              <BuildSteps steps={entry.steps} />
            </Card>
          )}

          {entry.resources.length > 0 && (
            <Card title="Reference resources" icon="▤">
              <ResourceList resources={entry.resources} />
            </Card>
          )}

          {entry.quiz.length > 0 && (
            <Card title={entry.kind === "build" ? "Let's test your work" : "Challenge questions"} icon="✎">
              <KnowledgeCheck day={entry.day} questions={entry.quiz} saved={submission?.quiz_answers ?? null} />
            </Card>
          )}

          <Card title="Your deliverable" icon="↥">
            <p className="mb-4 text-sm">
              <strong>Expected:</strong> <span dangerouslySetInnerHTML={{ __html: entry.deliverable }} />
              <span className="mt-1 block text-muted"><strong>Reviewer checks:</strong> {entry.reviewerChecks}</span>
            </p>
            <DaySubmission day={entry.day} submission={submission} needsLinkedinPost={LINKEDIN_POST_DAYS.includes(entry.day)} />
          </Card>

          <nav aria-label="Other days" className="flex justify-between gap-4 border-t-2 border-line pt-5 font-bold">
            {prev ? <Link href={`/learn/day/${prev.day}`} className="hover:text-red-deep">← Day {prev.day}</Link> : <span />}
            {next ? <Link href={`/learn/day/${next.day}`} className="hover:text-red-deep">Day {next.day} →</Link> : <span />}
          </nav>
        </div>
      </div>
    </div>
  );
}
