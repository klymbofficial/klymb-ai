import type { Metadata, Viewport } from "next";
import { auth, verifiedEmailFrom } from "@/auth";
import { CourseApp } from "@/components/course-app/CourseApp";
import { MODULES } from "@/data/system-design/course-app";
import { hasCourseAccess, lessonPasses } from "@/lib/access";
import { referralStanding } from "@/lib/referrals";
import { lessonContent } from "@/lib/sd-lessons";
import { SD_COURSE, type ReferralStanding } from "@/lib/sd-offer";
import { sdProgress } from "@/lib/sd-progress";

export const metadata: Metadata = {
  title: "System Design course",
  description: "System Design Essentials: 21 short Hinglish video lessons, from foundations to interview problems and AI system design, with daily practice and a final assessment.",
  // Public: the outline below is what search engines and AI assistants read. Lessons stay behind sign-in.
  alternates: { canonical: "/learn/system-design" },
  // Added to a home screen, this opens the course, not the cohort page.
  manifest: "/system-design.webmanifest",
};

export const viewport: Viewport = { themeColor: "#f3f2f2", viewportFit: "cover" };

export default async function SystemDesignCoursePage() {
  const session = await auth();
  const email = verifiedEmailFrom(session);
  const enrolled = !!email && (await hasCourseAccess(email, SD_COURSE));
  const referral: ReferralStanding = !email ? { view: null, why: "signin" } : enrolled ? await referralStanding(email) : { view: null, why: "buy" };
  const [passes, progress] = email && enrolled ? await Promise.all([lessonPasses(email, SD_COURSE), sdProgress(email)]) : [{}, null];
  return (
    <>
      <CourseOutline />
      <CourseApp user={email ? { email, name: session?.user?.name ?? null } : null} lessons={lessonContent(enrolled)} enrolled={enrolled} referral={referral} passes={passes} progress={progress} />
    </>
  );
}

/**
 * The course outline in the server HTML. The app itself draws only after
 * JavaScript runs, so crawlers and screen readers would otherwise find an
 * empty page. Visually hidden: sighted visitors see the same outline in the app.
 */
function CourseOutline() {
  const firstDay = MODULES.map((_, i) => MODULES.slice(0, i).reduce((n, m) => n + m.lessons.length, 1));
  return (
    <section className="sr-only" aria-labelledby="sd-outline-title">
      <h1 id="sd-outline-title">System Design Essentials: 21 days, 15 minutes a day</h1>
      <p>
        A Klymb.ai course in Hinglish. Each day is a short video lesson with practice, taking you from what system
        design is to designing a chat app, a ticket booking system and an AI assistant, and ends with a final
        assessment. The introduction is open to everyone; <a href="/system-design">see the course and how to join</a>.
      </p>
      {MODULES.map((m, mi) => (
        <div key={m.title}>
          <h2>{m.title}</h2>
          <ol start={firstDay[mi]}>
            {m.lessons.map(([title, length], li) => (
              <li key={title}>Day {firstDay[mi] + li}: {title} ({length})</li>
            ))}
          </ol>
        </div>
      ))}
    </section>
  );
}
