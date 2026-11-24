import type { ReactNode } from "react";
import {
  RESULTS_FOR_CANDIDATE,
  RESULTS_LABEL,
  SUBMISSION_LABEL,
  isMultiAnswer,
  minutesLabel,
  questionPoints,
  totalPoints,
  type CandidateTask,
  type Question,
  type Version,
} from "@/lib/company/assessment-rules";

/** A test's questions for the people who set and review it: sections, each question, its right options or its rubric with guides. */
function QuestionsDetails({ questions }: { questions: Question[] }) {
  return (
    <ol className="flex flex-col gap-6">
      {questions.map((q, i) => (
        <li key={i} className="flex flex-col gap-2 border-l-2 border-line/40 pl-4">
          {q.section && q.section !== questions[i - 1]?.section && <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">{q.section}</p>}
          <p className="text-xs text-muted">
            Question {i + 1} · {q.mcq ? `Multiple choice${isMultiAnswer(q.mcq) ? ", several correct" : ""}${q.mcq.partial ? ", partial marks" : ""}` : SUBMISSION_LABEL[q.submission]} · {questionPoints(q)} points
            {q.source ? " · from the library" : ""}
          </p>
          <h3 className="text-base font-bold">{q.title}</h3>
          <Prose text={q.brief} />
          {q.mcq ? (
            <ol className="mt-1 flex flex-col gap-1 text-sm">
              {q.mcq.options.map((o, k) => (
                <li key={k} className={o.correct ? "font-bold text-[#14532d]" : ""}>{String.fromCharCode(65 + k)}. {o.text}{o.correct ? " — correct" : ""}</li>
              ))}
            </ol>
          ) : (
            <ul className="mt-1 flex flex-col gap-2">
              {q.rubric.map((c) => (
                <li key={c.title} className="text-sm">
                  <span className="font-bold">{c.title}</span> <span className="text-xs text-muted">· {c.skill} · {c.points} {c.points === 1 ? "point" : "points"}</span>
                  <Prose text={c.guide} className="mt-0.5" />
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}

const section = "border-t border-line/30 pt-5";
const h2 = "text-xs font-extrabold uppercase tracking-[0.14em] text-muted";

/** Keeps the line breaks someone typed, without any markup. */
export function Prose({ text, className }: { text: string; className?: string }) {
  return (
    <div className={className}>
      {text.split(/\n{2,}/).map((para, i) => (
        <p key={i} className="mt-2 whitespace-pre-line text-sm first:mt-0">{para}</p>
      ))}
    </div>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-bold text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className={section} aria-labelledby={id}>
      <h2 id={id} className={h2}>{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Tools({ allowed, notAllowed }: { allowed: readonly string[]; notAllowed: readonly string[] }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      <Fact label="Allowed">{allowed.length ? <ul className="list-disc space-y-0.5 pl-5">{allowed.map((t) => <li key={t}>{t}</li>)}</ul> : "Nothing listed"}</Fact>
      <Fact label="Not allowed">{notAllowed.length ? <ul className="list-disc space-y-0.5 pl-5">{notAllowed.map((t) => <li key={t}>{t}</li>)}</ul> : "Nothing listed"}</Fact>
    </dl>
  );
}

/**
 * Everything one version holds, for the people who run it: the real task,
 * the practice task, and the rubric with each area's skill, points and
 * scoring guide. Never shown to a candidate.
 */
export function VersionDetails({ v }: { v: Version }) {
  return (
    <div className="flex flex-col gap-8">
      <dl className="grid gap-3 sm:grid-cols-3">
        <Fact label="Role">{v.role}</Fact>
        <Fact label="Time allowed">{minutesLabel(v.minutes)}</Fact>
        <Fact label="Hand in">{SUBMISSION_LABEL[v.submission]}</Fact>
      </dl>

      {v.questions?.length ? (
        <Section id="v-task" title={`Questions · ${v.questions.length} · ${v.questions.reduce((n, q) => n + questionPoints(q), 0)} points`}>
          <QuestionsDetails questions={v.questions} />
          <p className="mt-3 text-xs text-muted">Right options and scoring guides are for reviewers only. Candidates see the questions, options and points.</p>
        </Section>
      ) : (
      <Section id="v-task" title="Task">
        <h3 className="text-base font-bold">{v.taskTitle}</h3>
        <Prose text={v.taskBrief} className="mt-2" />
      </Section>
      )}

      <Section id="v-instructions" title="Instructions for candidates">
        <Prose text={v.instructions} />
      </Section>

      <Section id="v-tools" title="Tools">
        <Tools allowed={v.toolsAllowed} notAllowed={v.toolsNotAllowed} />
      </Section>

      {!v.questions?.length && (
      <Section id="v-rubric" title={`Rubric · ${totalPoints(v.rubric)} points`}>
        <ol className="flex flex-col gap-4">
          {v.rubric.map((c, i) => (
            <li key={c.title} className="flex gap-4">
              <span className="display w-6 shrink-0 text-lg tabular-nums">{i + 1}</span>
              <div className="min-w-0">
                <p className="text-sm font-bold">{c.title}</p>
                <p className="text-xs text-muted">{c.skill} · {c.points} {c.points === 1 ? "point" : "points"}</p>
                <Prose text={c.guide} className="mt-1.5" />
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-muted">Scoring guides are for reviewers only. Candidates see the area names and points.</p>
      </Section>
      )}

      <Section id="v-practice" title="Practice task">
        <h3 className="text-base font-bold">{v.sampleTitle}</h3>
        <Prose text={v.sampleBrief} className="mt-2" />
        <p className="mt-2 text-xs text-muted">Shared before the test so people can prepare. It differs from the real task.</p>
      </Section>

      <Section id="v-results" title="What candidates see afterwards">
        <p className="text-sm">{RESULTS_LABEL[v.results]}.</p>
      </Section>
    </div>
  );
}

/** The test as a candidate will meet it: the brief, the rules and how it's marked. No scoring guide. */
export function CandidatePreview({ t }: { t: CandidateTask }) {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">{t.role}</p>
        <h2 className="display text-2xl">{t.title}</h2>
        <p className="text-sm">
          You have <strong>{minutesLabel(t.minutes)}</strong> from when you start.{" "}
          {t.questions
            ? `Answer ${t.questions.length} questions, in any order.`
            : `Hand in ${SUBMISSION_LABEL[t.submission].charAt(0).toLowerCase() + SUBMISSION_LABEL[t.submission].slice(1)}.`}
        </p>
      </header>

      <Section id="c-instructions" title="Before you start">
        <Prose text={t.instructions} />
      </Section>

      <Section id="c-tools" title="Tools">
        <Tools allowed={t.toolsAllowed} notAllowed={t.toolsNotAllowed} />
      </Section>

      {t.questions ? (
        <Section id="c-task" title={`Questions · ${t.questions.length}`}>
          <ol className="flex flex-col gap-6">
            {t.questions.map((q, i) => (
              <li key={q.no} className="flex flex-col gap-2">
                {q.section && q.section !== t.questions![i - 1]?.section && <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">{q.section}</p>}
                <p className="text-xs text-muted">Question {q.no} · {q.points} {q.points === 1 ? "point" : "points"}{q.kind === "mcq" ? (q.multi ? " · choose all that apply" : " · choose one") : ""}</p>
                <h3 className="text-base font-bold">{q.title}</h3>
                <Prose text={q.brief} />
                {q.kind === "mcq" && (
                  <ul className="flex flex-col gap-1.5">
                    {q.options.map((o, k) => (
                      <li key={k} className="flex items-start gap-2 rounded-md border border-line/30 px-3 py-2 text-sm">
                        <span aria-hidden="true" className={`mt-0.5 size-4 shrink-0 border-2 border-line/60 ${q.multi ? "rounded-sm" : "rounded-full"}`} />
                        {o}
                      </li>
                    ))}
                  </ul>
                )}
                {q.areas.length > 0 && <p className="text-xs text-muted">Scored on: {q.areas.map((a) => `${a.title} (${a.points})`).join(", ")}</p>}
              </li>
            ))}
          </ol>
        </Section>
      ) : (
      <Section id="c-task" title="Your task">
        <h3 className="text-base font-bold">{t.taskTitle}</h3>
        <Prose text={t.taskBrief} className="mt-2" />
      </Section>
      )}

      {!t.questions && (
      <Section id="c-marking" title="How it's marked">
        <ul className="flex flex-col gap-1.5 text-sm">
          {t.areas.map((a) => (
            <li key={a.title} className="flex justify-between gap-4 border-b border-line/20 pb-1.5">
              <span>{a.title}</span>
              <span className="shrink-0 tabular-nums text-muted">{a.points} {a.points === 1 ? "point" : "points"}</span>
            </li>
          ))}
        </ul>
      </Section>
      )}

      <Section id="c-after" title="Afterwards">
        <p className="text-sm">{RESULTS_FOR_CANDIDATE[t.results]}</p>
      </Section>
    </div>
  );
}
