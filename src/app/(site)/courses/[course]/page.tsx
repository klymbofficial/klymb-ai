import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { currentEmail } from "@/auth";
import { CourseFrame } from "@/components/course/course-frame";
import { CourseHero } from "@/components/course/course-hero";
import { CourseProgressProvider } from "@/components/course/course-progress";
import { COURSES, getCourse } from "@/data/courses/registry";
import { readCourseProgress } from "@/lib/course-progress";
import { frameModules } from "@/lib/course-frame";

export function generateStaticParams() {
  return COURSES.map((c) => ({ course: c.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ course: string }> }): Promise<Metadata> {
  const course = getCourse((await params).course);
  return course ? { title: course.title, description: course.tagline } : {};
}

/**
 * A self-paced course's overview, open to anyone. Signed in, the start button
 * picks up where they left off; reading a module asks them to log in, so their
 * progress is saved to their account.
 */
export default async function CourseOverviewPage({ params }: { params: Promise<{ course: string }> }) {
  const course = getCourse((await params).course);
  if (!course) notFound();
  const email = await currentEmail();
  const progress = email ? await readCourseProgress(email, course.slug) : { done: [], quiz: {} };
  const modules = frameModules(course);
  const totalMinutes = course.modules.reduce((s, m) => s + m.minutes, 0);

  return (
    <CourseProgressProvider course={course.slug} initial={progress}>
      <CourseFrame courseSlug={course.slug} courseTitle={course.title} modules={modules}>
        <article className="crs-article">
          <CourseHero
            course={course.slug}
            modules={modules.map((m) => m.slug)}
            eyebrow={`Course · ${course.modules.length} modules · ~${Math.round(totalMinutes / 60)} hours`}
            title={course.title}
            tagline={course.tagline}
            meta={course.level}
            orbit={course.hero}
          />
          <p>{course.description}</p>

          <h2 id="outcomes">What you will be able to do</h2>
          <ul>
            {course.outcomes.map((o) => <li key={o}>{o}</li>)}
          </ul>

          <h2 id="modules">Modules</h2>
          <ol style={{ listStyle: "none", padding: 0 }}>
            {course.modules.map((m) => (
              <li key={m.slug} className="crs-frame" style={{ margin: "12px 0" }}>
                <Link href={`/learn/courses/${course.slug}/${m.slug}`} style={{ textDecoration: "none" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--c-mu)" }}>Module {m.number} · ~{m.minutes} min</span>
                  <span style={{ display: "block", fontWeight: 700, fontSize: "1.08rem", color: "var(--c-pri)" }}>{m.title}</span>
                  <span style={{ display: "block", fontSize: "0.92rem", color: "var(--c-fg)" }}>{m.summary}</span>
                </Link>
              </li>
            ))}
          </ol>
          <h2 id="skills">Skills you will have by the end</h2>
          <p>Complete all {course.modules.length} modules and these are the skills this course builds:</p>
          <ul className="crs-skills">
            {course.skills.map((sk) => <li key={sk}>{sk}</li>)}
          </ul>
        </article>
      </CourseFrame>
    </CourseProgressProvider>
  );
}
