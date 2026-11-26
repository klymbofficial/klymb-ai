import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BTN_PRIMARY, OrgPageHead, PANEL } from "@/components/company/HiringParts";
import { LoadError } from "@/components/company/OrgPanels";
import { FinalAssessment } from "@/components/company/learn/FinalAssessment";
import { learnBase, lessonHref } from "@/components/company/learn/LearnerParts";
import { requireCompany } from "@/lib/company/auth";
import { loadLearner } from "@/lib/company/learner-data";
import { finalOpen } from "@/lib/company/learner-plan";
import { trackedCourse } from "@/lib/company/upskill-course";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "Final assessment", robots: { index: false, follow: false } };

/** The final assessment of a company-assigned course (user, 26 Nov). Open once every lesson is passed. */
export default async function FinalPage({ params }: { params: Promise<{ slug: string; course: string }> }) {
  const { slug, course: courseSlug } = await params;
  const member = await requireCompany(slug);
  const course = trackedCourse(courseSlug);
  if (!course) notFound();
  const home = `/org/${member.companySlug}/learning`;
  const base = learnBase(member.companySlug, course.slug);
  const crumbs = [{ href: home, label: "My Upskill" }, { href: base, label: course.title }, { label: "Final assessment" }];

  const sql = db();
  const me = sql ? await loadLearner(sql, member) : undefined;
  if (me === null) redirect(home);
  if (!me) return <><OrgPageHead crumbs={crumbs} title="Final assessment" /><LoadError what="The final assessment" /></>;

  const head = <OrgPageHead crumbs={crumbs} title="Final assessment" meta={<><span>{course.title}</span><span>{course.finalMark}% to pass</span>{me.finalBest !== null && <span>Best so far: {me.finalBest}%</span>}</>} />;

  if (!finalOpen(course.lessons.map((l) => l.id), me.passed)) {
    const left = course.lessons.length - me.passed.size;
    return (
      <>
        {head}
        <div className={`${PANEL} max-w-xl p-6`}>
          <h2 className="text-lg font-bold">Not open yet</h2>
          <p className="mt-2 text-sm text-muted">The final opens once every lesson is passed. {left} {left === 1 ? "lesson" : "lessons"} to go.</p>
          {me.next && <Link href={lessonHref(member.companySlug, course.slug, me.next.id)} className={`${BTN_PRIMARY} mt-5`}>Continue with lesson {me.next.no}</Link>}
        </div>
      </>
    );
  }

  return (
    <>
      {head}
      <div className="max-w-3xl">
        <FinalAssessment
          slug={member.companySlug}
          attempt={me.finals.length + 1}
          mark={course.finalMark}
          best={me.finalBest}
          courseHref={base}
          lessons={Object.fromEntries(course.lessons.map((l) => [l.id, { no: l.no, title: l.title }]))}
        />
      </div>
    </>
  );
}
