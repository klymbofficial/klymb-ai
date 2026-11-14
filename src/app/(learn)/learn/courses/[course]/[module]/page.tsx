import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth, verifiedEmailFrom } from "@/auth";
import { BlockRenderer } from "@/components/course/block-renderer";
import { CourseFrame } from "@/components/course/course-frame";
import { CourseProgressProvider } from "@/components/course/course-progress";
import { ModuleComplete } from "@/components/course/module-complete";
import { LearnerTopBar } from "@/components/learner/LearnerTopBar";
import { COURSES, getCourse } from "@/data/courses/registry";
import { readCourseProgress } from "@/lib/course-progress";
import { frameModules } from "@/lib/course-frame";

type RouteParams = { params: Promise<{ course: string; module: string }> };

export function generateStaticParams() {
  return COURSES.flatMap((c) => c.modules.map((m) => ({ course: c.slug, module: m.slug })));
}

export const dynamicParams = false;

async function resolve(params: RouteParams["params"]) {
  const p = await params;
  const course = getCourse(p.course);
  const idx = course?.modules.findIndex((m) => m.slug === p.module) ?? -1;
  return course && idx >= 0 ? { course, idx, mod: course.modules[idx] } : null;
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const r = await resolve(params);
  return r ? { title: `${r.mod.title}, ${r.course.title}`, description: r.mod.summary, robots: { index: false, follow: false } } : {};
}

/** One module of a self-paced course, for a signed-in learner, with their progress saved to their account. */
export default async function CourseModulePage({ params }: RouteParams) {
  const r = await resolve(params);
  if (!r) notFound();
  const session = await auth();
  const email = verifiedEmailFrom(session);
  if (!email) redirect("/learn/login");
  const { course, idx, mod } = r;
  const prev = course.modules[idx - 1];
  const next = course.modules[idx + 1];
  const progress = await readCourseProgress(email, course.slug);
  const name = session?.user?.name || email.split("@")[0];

  return (
    <>
      <LearnerTopBar name={name} image={session?.user?.image} />
      <CourseProgressProvider course={course.slug} initial={progress}>
        <CourseFrame courseSlug={course.slug} courseTitle={course.title} modules={frameModules(course)} current={mod.slug}>
          <article className="crs-article">
            <p style={{ fontSize: "0.8rem", color: "var(--c-mu)", textTransform: "uppercase", letterSpacing: ".06em", margin: 0 }}>
              Module {mod.number} of {course.modules.length} · ~{mod.minutes} min read
            </p>
            <h1>{mod.title}</h1>
            <p style={{ fontSize: "1.08rem", color: "var(--c-mu)" }}>{mod.summary}</p>
            <BlockRenderer blocks={mod.blocks} course={course.slug} module={mod.slug} moduleNumber={mod.number} />
            <ModuleComplete course={course.slug} module={mod.slug} />
            <nav aria-label="Module navigation" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
              {prev ? (
                <Link className="crs-btn crs-btn-ghost" style={{ textDecoration: "none" }} href={`/learn/courses/${course.slug}/${prev.slug}`}>
                  ← {prev.number}. {prev.title}
                </Link>
              ) : <span />}
              {next ? (
                <Link className="crs-btn" style={{ textDecoration: "none" }} href={`/learn/courses/${course.slug}/${next.slug}`}>
                  {next.number}. {next.title} →
                </Link>
              ) : (
                <Link className="crs-btn" style={{ textDecoration: "none" }} href="/learn">Back to dashboard</Link>
              )}
            </nav>
          </article>
        </CourseFrame>
      </CourseProgressProvider>
    </>
  );
}
