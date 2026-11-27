import clsx from "clsx";
import Link from "next/link";
import { LESSON_RELEASES, QUESTIONS } from "@/data/system-design/course-app";
import { Badge, BTN_PRIMARY, PANEL } from "@/components/company/HiringParts";
import { ProgressMeter } from "@/components/company/OrgCharts";
import { OutlineScroll } from "@/components/company/learn/OutlineScroll";
import type { LearnerRecord } from "@/lib/company/learner-data";
import { durationText, finalOpen, pacePlan, todayIst, type LessonState } from "@/lib/company/learner-plan";
import type { TrackedLesson } from "@/lib/company/upskill-course";
import { PASS_MARK } from "@/lib/course-app";

/**
 * The pieces an employee's course pages share (user, 26 Nov): what's next in
 * one tap, where they stand against the due date, and the whole course as a
 * checklist. Plain and quiet, like Assessments.
 */

export const learnBase = (slug: string, course: string) => `/org/${slug}/learning/${course}`;
export const lessonHref = (slug: string, course: string, id: string) => `${learnBase(slug, course)}/lessons/${id}`;

export const longDate = (d: string) => new Date(d.length === 10 ? `${d}T00:00:00Z` : d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: d.length === 10 ? "UTC" : "Asia/Kolkata" });
const CHECK_PASS = Math.round(PASS_MARK * 100);

/** Where the learner goes next: a lesson, the final, or their certificate. */
export function nextStep(slug: string, me: LearnerRecord): { href: string | null; label: string; eyebrow: string; title: string; meta: string } {
  const base = learnBase(slug, me.course.slug);
  if (me.certifiedAt) return { href: `${base}/certificate`, label: "View certificate", eyebrow: "Course complete", title: "You passed the course", meta: `Final assessment: ${me.finalBest}%` };
  if (finalOpen(me.course.lessons.map((l) => l.id), me.passed)) {
    return { href: `${base}/final`, label: me.finals.length ? "Retake the final" : "Start the final", eyebrow: "Final assessment", title: "Every lesson is passed", meta: `${QUESTIONS.length} questions · ${me.course.finalMark}% to pass · about 10 min${me.finalBest !== null ? ` · best so far ${me.finalBest}%` : ""}` };
  }
  const l = me.next!;
  const state = me.states.get(l.id);
  const mod = me.course.modules[l.module];
  const started = me.passed.size > 0;
  if (state === "soon") {
    return { href: null, label: "Coming soon", eyebrow: `Lesson ${l.no} of ${me.course.lessons.length}`, title: l.title, meta: `Out on ${longDate(LESSON_RELEASES[l.id] ?? "")}. We'll have it ready for you.` };
  }
  return {
    href: lessonHref(slug, me.course.slug, l.id),
    label: started ? `Continue with lesson ${l.no}` : "Start lesson 1",
    eyebrow: `Up next · Lesson ${l.no} of ${me.course.lessons.length} · ${mod.title}`,
    title: l.title,
    meta: `${durationText(l.minutes)} video, then a short check (${CHECK_PASS}% to pass)`,
  };
}

/** "Required · due 15 Dec 2026", "Recommended". */
export function AssignmentMeta({ me, company }: { me: LearnerRecord; company: string }) {
  const overdue = !!me.dueOn && me.dueOn < todayIst(new Date());
  return (
    <>
      <span>Assigned by {company}</span>
      <span className="inline-flex items-center gap-2">
        <Badge tone={me.requirement === "required" ? "red" : "grey"}>{me.requirement === "required" ? "Required" : "Recommended"}</Badge>
        {me.dueOn ? <span>Due {longDate(me.dueOn)}</span> : <span>No due date</span>}
        {overdue && !me.certifiedAt && <Badge tone="amber">Overdue</Badge>}
      </span>
    </>
  );
}

/** The one card at the top: what to do next, one tap away, with progress and the suggested pace beside it. */
export function UpNext({ slug, me }: { slug: string; me: LearnerRecord }) {
  const step = nextStep(slug, me);
  const total = me.course.lessons.length;
  const plan = pacePlan({ total, passed: me.passed.size, dueOn: me.dueOn, assignedAt: me.assignedAt, now: new Date() });
  const done = !!me.certifiedAt;
  return (
    <section aria-label="Up next" className={clsx(PANEL, "overflow-hidden")}>
      <div className="flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-red-strong">{step.eyebrow}</p>
          <h2 className="mt-2 text-2xl font-bold text-balance">{step.title}</h2>
          <p className="mt-1 text-sm text-muted">{step.meta}</p>
          {step.href ? (
            <Link href={step.href} className={clsx(BTN_PRIMARY, "mt-5 min-h-11 px-5")}>{step.label} <span aria-hidden="true">→</span></Link>
          ) : (
            <span className="mt-5 inline-flex min-h-11 items-center rounded-md bg-slate-100 px-5 text-sm font-bold text-muted">{step.label}</span>
          )}
        </div>
        <div className="w-full shrink-0 rounded-md bg-slate-50 p-4 lg:w-72">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-semibold">Your progress</span>
            <span className="text-sm tabular-nums text-muted">{me.passed.size} of {total} lessons</span>
          </div>
          <div className="mt-2"><ProgressMeter value={me.passed.size} total={total} label="Lessons passed" color={done ? "#15803d" : "#83050b"} /></div>
          <p className="mt-3 text-sm text-muted">{me.passed.size >= total ? (done ? "Course complete." : "All lessons done. Only the final is left.") : `About ${durationText(me.course.lessons.filter((l) => !me.passed.has(l.id)).reduce((s, l) => s + l.minutes, 0))} of video left.`}</p>
        </div>
      </div>
      {!done && (
        <p className={clsx("flex items-start gap-2 border-t px-5 py-3 text-sm sm:px-6", plan.tone === "warn" ? "border-[#f3d9c4] bg-[#fdf1e7] text-[#6b3300]" : "border-line/25 bg-white text-muted")}>
          <span aria-hidden="true" className={clsx("mt-1.5 size-2 shrink-0 rounded-full", plan.tone === "warn" ? "bg-[#c2410c]" : plan.tone === "done" ? "bg-[#15803d]" : "bg-red-strong")} />
          <span><strong className="font-semibold text-ink">Suggested pace:</strong> {plan.line}</span>
        </p>
      )}
    </section>
  );
}

const STATE_ICON: Record<LessonState, string> = { passed: "✓", open: "▶", locked: "", soon: "" };

function LessonRow({ slug, me, l, current }: { slug: string; me: LearnerRecord; l: TrackedLesson; current?: boolean }) {
  const state = me.states.get(l.id) ?? "locked";
  const check = me.checks.get(l.id);
  const go = state === "passed" || state === "open";
  const right =
    state === "passed" ? <span className="text-sm tabular-nums text-[#14532d]">Passed{check ? ` · ${check.bestScore}%` : ""}</span>
    : state === "open" ? <span className="text-sm font-bold text-red-strong">{check ? "Try the check again" : me.passed.size ? "Continue" : "Start"}</span>
    : state === "soon" ? <span className="text-sm text-muted">Out {longDate(LESSON_RELEASES[l.id] ?? "")}</span>
    : <span className="text-sm text-muted"><span className="sr-only">Locked. </span>Locked</span>;
  const body = (
    <>
      <span aria-hidden="true" className={clsx(
        "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
        state === "passed" ? "bg-[#e4f2ec] text-[#14532d]" : state === "open" ? "bg-red-strong text-white" : "border border-line/50 text-muted",
      )}>{STATE_ICON[state] || l.no}</span>
      <span className="min-w-0 flex-1">
        <span className={clsx("block truncate text-sm", go ? "font-semibold text-ink" : "text-muted")}>{l.no}. {l.title}</span>
        <span className="block text-xs text-muted">{durationText(l.minutes)}</span>
      </span>
      {right}
    </>
  );
  const cls = clsx("flex min-h-14 items-center gap-3 px-4 py-2", current && "bg-red-tint");
  return (
    <li className="border-t border-line/20 first:border-t-0">
      {go ? <Link href={lessonHref(slug, me.course.slug, l.id)} aria-current={current ? "page" : undefined} className={clsx(cls, "hover:bg-slate-50")}>{body}</Link> : <div className={cls}>{body}</div>}
    </li>
  );
}

/** Every module and lesson, as a checklist: passed, open, locked or coming soon. */
export function Syllabus({ slug, me }: { slug: string; me: LearnerRecord }) {
  return (
    <div className="flex flex-col gap-4">
      {me.course.modules.map((m, mi) => {
        const n = m.lessons.filter((l) => me.passed.has(l.id)).length;
        return (
          <section key={m.title} aria-labelledby={`mod-${mi}`} className={PANEL}>
            <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line/25 px-4 py-3">
              <h3 id={`mod-${mi}`} className="font-bold">Module {mi + 1} · {m.title}</h3>
              <span className="text-sm text-muted">{n === m.lessons.length ? "Complete" : `${n} of ${m.lessons.length} passed`}</span>
            </header>
            <ol>{m.lessons.map((l) => <LessonRow key={l.id} slug={slug} me={me} l={l} />)}</ol>
          </section>
        );
      })}
    </div>
  );
}

/** The final assessment, and the certificate once it's passed. */
export function FinalRow({ slug, me }: { slug: string; me: LearnerRecord }) {
  const base = learnBase(slug, me.course.slug);
  const open = finalOpen(me.course.lessons.map((l) => l.id), me.passed);
  return (
    <section aria-labelledby="final-title" className={clsx(PANEL, "flex flex-col gap-4 p-4 sm:flex-row sm:items-center")}>
      <span aria-hidden="true" className={clsx("flex size-10 shrink-0 items-center justify-center rounded-md text-lg font-bold", me.certifiedAt ? "bg-[#e4f2ec] text-[#14532d]" : open ? "bg-red-strong text-white" : "bg-slate-100 text-muted")}>{me.certifiedAt ? "✓" : "★"}</span>
      <div className="min-w-0 flex-1">
        <h3 id="final-title" className="font-bold">Final assessment</h3>
        <p className="text-sm text-muted">
          {QUESTIONS.length} questions · {me.course.finalMark}% to pass · retakes allowed, your best score counts
          {me.finalBest !== null && <> · best {me.finalBest}% in {me.finals.length} {me.finals.length === 1 ? "try" : "tries"}</>}
        </p>
      </div>
      {me.certifiedAt ? (
        <Link href={`${base}/certificate`} className={BTN_PRIMARY}>View certificate</Link>
      ) : open ? (
        <Link href={`${base}/final`} className={BTN_PRIMARY}>{me.finals.length ? "Retake the final" : "Start the final"}</Link>
      ) : (
        <span className="text-sm text-muted">Unlocks after all {me.course.lessons.length} lessons</span>
      )}
    </section>
  );
}

/** The whole course beside a lesson: every module, in a list that scrolls on its own and opens at this lesson. */
export function ModuleOutline({ slug, me, lessonId }: { slug: string; me: LearnerRecord; lessonId: string }) {
  return (
    <nav aria-label="Course lessons" className={clsx(PANEL, "overflow-hidden")}>
      <header className="flex items-baseline justify-between gap-2 border-b border-line/25 px-4 py-3">
        <p className="font-bold">Course content</p>
        <p className="text-xs text-muted">{me.passed.size} of {me.course.lessons.length} passed</p>
      </header>
      <OutlineScroll className="max-h-[min(70vh,34rem)] overflow-y-auto overscroll-contain">
        {me.course.modules.map((m, mi) => (
          <section key={m.title} aria-labelledby={`outline-${mi}`}>
            <h3 id={`outline-${mi}`} className="sticky top-0 z-[1] border-b border-line/20 bg-slate-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted">Module {mi + 1} · {m.title}</h3>
            <ol>{m.lessons.map((x) => <LessonRow key={x.id} slug={slug} me={me} l={x} current={x.id === lessonId} />)}</ol>
          </section>
        ))}
      </OutlineScroll>
    </nav>
  );
}
