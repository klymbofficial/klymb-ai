import clsx from "clsx";
import Link from "next/link";
import { OrgPageHead, PANEL } from "@/components/company/HiringParts";
import { ProgressMeter } from "@/components/company/OrgCharts";
import { AssignmentMeta, FinalRow, Syllabus, UpNext, learnBase, nextStep } from "@/components/company/learn/LearnerParts";
import type { LearnerRecord } from "@/lib/company/learner-data";
import { PASS_MARK } from "@/lib/course-app";

/**
 * An employee's course (user, 26 Nov): one card that says what to do next,
 * then the whole course as a checklist, with how it works beside it. Nothing
 * from the public course's sales side: no refund, referral, community or streak.
 */
export function LearnerCourseHome({ slug, me, company, home }: { slug: string; me: LearnerRecord; company: string; home: string }) {
  const scored = [...me.checks.values()];
  const avg = scored.length ? Math.round(scored.reduce((s, c) => s + c.bestScore, 0) / scored.length) : null;
  return (
    <>
      <OrgPageHead crumbs={[{ href: home, label: "My Upskill" }, { label: me.course.title }]} title={me.course.title} meta={<AssignmentMeta me={me} company={company} />} />
      <UpNext slug={slug} me={me} />

      <dl className="mt-4 grid grid-cols-3 gap-3">
        {[
          ["Lessons passed", `${me.passed.size} / ${me.course.lessons.length}`],
          ["Average check score", avg === null ? "—" : `${avg}%`],
          ["Final assessment", me.finalBest === null ? (me.passed.size >= me.course.lessons.length ? "Ready" : "Locked") : `${me.finalBest}%`],
        ].map(([k, v]) => (
          <div key={k} className={clsx(PANEL, "px-4 py-3")}>
            <dt className="text-xs font-semibold text-muted">{k}</dt>
            <dd className="mt-1 text-xl font-bold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section aria-labelledby="content-title" className="flex min-w-0 flex-col gap-4">
          <h2 id="content-title" className="text-lg font-bold">Course content</h2>
          <Syllabus slug={slug} me={me} />
          <FinalRow slug={slug} me={me} />
        </section>
        <aside aria-labelledby="how-title" className={clsx(PANEL, "p-5 text-sm lg:sticky lg:top-6")}>
          <h2 id="how-title" className="font-bold">How this course works</h2>
          <ol className="mt-3 flex flex-col gap-3">
            {[
              ["Watch a short video", "Each lesson is one video, a few minutes long."],
              ["Pass its quick check", `${Math.round(PASS_MARK * 100)}% to pass. The next lesson opens straight away, so go at your own pace.`],
              ["Take the final", `After every lesson: ${me.course.finalMark}% to pass, and a certificate with your name.`],
            ].map(([t, b], i) => (
              <li key={t} className="flex gap-3">
                <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-red-tint text-xs font-bold text-red-strong">{i + 1}</span>
                <span><strong className="block font-semibold">{t}</strong><span className="text-muted">{b}</span></span>
              </li>
            ))}
          </ol>
          <p className="mt-4 border-t border-line/25 pt-4 text-muted">{company} can see the lessons you pass, your scores and when you were last active.</p>
        </aside>
      </div>
    </>
  );
}

/** One assigned course on My Upskill: what it is, the due date, progress, and the next step in one tap. */
export function MyCourseCard({ slug, me, company }: { slug: string; me: LearnerRecord; company: string }) {
  const step = nextStep(slug, me);
  const total = me.course.lessons.length;
  return (
    <li className={clsx(PANEL, "p-5 sm:p-6")}>
      <div className="flex flex-col gap-5 md:flex-row md:items-center">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold"><Link href={learnBase(slug, me.course.slug)} className="underline-offset-4 hover:text-red-strong hover:underline">{me.course.title}</Link></h2>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted"><AssignmentMeta me={me} company={company} /></div>
          <div className="mt-4 flex items-center gap-3">
            <div className="max-w-xs flex-1"><ProgressMeter value={me.passed.size} total={total} label="Lessons passed" color={me.certifiedAt ? "#15803d" : "#83050b"} /></div>
            <span className="text-sm tabular-nums text-muted">{me.passed.size} of {total} lessons</span>
          </div>
          <p className="mt-3 text-sm"><span className="text-muted">{step.eyebrow.replace(/^Up next · /, "Next: ")}</span>{step.href && me.next && !me.certifiedAt ? <> · <span className="font-semibold">{step.title}</span></> : null}</p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 md:items-end">
          {step.href ? <Link href={step.href} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border-2 border-red-strong bg-red-strong px-5 text-sm font-bold text-white hover:border-red-press hover:bg-red-press">{step.label} <span aria-hidden="true">→</span></Link> : <span className="text-sm text-muted">{step.label}</span>}
          <Link href={learnBase(slug, me.course.slug)} className="text-sm font-semibold text-red-strong underline-offset-4 hover:underline">Course details</Link>
        </div>
      </div>
    </li>
  );
}
