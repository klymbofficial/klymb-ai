import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LESSON_RELEASES } from "@/data/system-design/course-app";
import { BTN_PRIMARY, OrgPageHead, PANEL } from "@/components/company/HiringParts";
import { LoadError } from "@/components/company/OrgPanels";
import { ModuleOutline, learnBase, lessonHref, longDate } from "@/components/company/learn/LearnerParts";
import { LessonView } from "@/components/company/learn/LessonView";
import { requireCompany } from "@/lib/company/auth";
import { loadLearner } from "@/lib/company/learner-data";
import { durationText } from "@/lib/company/learner-plan";
import { trackedCourse } from "@/lib/company/upskill-course";
import { db } from "@/lib/db/client";
import { lessonContent } from "@/lib/sd-lessons";

export const metadata: Metadata = { title: "Lesson", robots: { index: false, follow: false } };

/**
 * One lesson of a company-assigned course, in the workspace (user, 26 Nov).
 * Anyone the company assigned the course to may open it, whatever their role.
 * A lesson not open yet says plainly what opens it, with the way there.
 */
export default async function LessonPage({ params }: { params: Promise<{ slug: string; course: string; lesson: string }> }) {
  const { slug, course: courseSlug, lesson: lessonId } = await params;
  const member = await requireCompany(slug);
  const course = trackedCourse(courseSlug);
  const lesson = course?.lessons.find((l) => l.id === lessonId);
  if (!course || !lesson) notFound();
  const home = `/org/${member.companySlug}/learning`;
  const base = learnBase(member.companySlug, course.slug);
  const crumbs = [{ href: home, label: "My Upskill" }, { href: base, label: course.title }, { label: `Lesson ${lesson.no}` }];

  const sql = db();
  const me = sql ? await loadLearner(sql, member) : undefined;
  if (me === null) redirect(home);
  if (!me) return <><OrgPageHead crumbs={crumbs} title={lesson.title} /><LoadError what="This lesson" /></>;

  const state = me.states.get(lesson.id);
  const mod = course.modules[lesson.module];
  const head = (
    <OrgPageHead
      crumbs={crumbs}
      title={lesson.title}
      meta={<><span>Lesson {lesson.no} of {course.lessons.length}</span><span>Module {lesson.module + 1} · {mod.title}</span><span>{durationText(lesson.minutes)} video</span></>}
    />
  );

  if (state === "locked" || state === "soon") {
    const open = me.next!;
    return (
      <>
        {head}
        <div className={`${PANEL} max-w-xl p-6`}>
          <h2 className="text-lg font-bold">{state === "soon" ? "This lesson isn't out yet" : "Not open yet"}</h2>
          <p className="mt-2 text-sm text-muted">
            {state === "soon"
              ? `It comes out on ${longDate(LESSON_RELEASES[lesson.id] ?? "")}.`
              : `Lessons open one after another. Pass lesson ${open.no}, "${open.title}", and the next one opens straight away.`}
          </p>
          {state === "locked" && me.states.get(open.id) === "open" && <Link href={lessonHref(member.companySlug, course.slug, open.id)} className={`${BTN_PRIMARY} mt-5`}>Go to lesson {open.no}</Link>}
        </div>
      </>
    );
  }

  const content = lessonContent(true)[lesson.id];
  if (!content) notFound();
  const check = me.checks.get(lesson.id);
  return (
    <>
      {head}
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <LessonView
          slug={member.companySlug}
          lessonId={lesson.id}
          day={content.day}
          content={content}
          email={member.email}
          name={me.name}
          best={check ? { score: check.bestScore, attempts: check.attempts, passed: !!check.passedAt } : null}
          courseHref={base}
          lessonHrefBase={`${base}/lessons`}
        />
        <div className="lg:sticky lg:top-6"><ModuleOutline slug={member.companySlug} me={me} lessonId={lesson.id} /></div>
      </div>
    </>
  );
}
