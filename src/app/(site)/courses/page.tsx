import type { Metadata } from "next";
import Link from "next/link";
import { Appear } from "@/components/motion/Appear";
import { Discovery } from "@/components/catalog/Discovery";
import { ProgramGroups } from "@/components/catalog/ProgramGroups";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { availablePrograms, programs, unavailablePrograms } from "@/data/catalog";

export const metadata: Metadata = {
  title: "Courses",
  description: "Every Klymb.ai course, by role and by industry, with what you can enrol in today and what is not available yet.",
};

export default function CoursesPage() {
  return (
    <>
      <section aria-labelledby="courses-title" className="mx-auto max-w-7xl px-4 pb-6 sm:px-6">
        <div className="card rounded-slab p-8 shadow-float sm:p-12 lg:p-16">
          <Appear><Eyebrow>Course library</Eyebrow></Appear>
          <Appear delay={0.08} y={24}>
            <h1 id="courses-title" className="display mt-5 max-w-3xl text-[clamp(2.4rem,6vw,4.25rem)] text-balance">
              Find the course for <span className="text-red-strong">your role or industry.</span>
            </h1>
          </Appear>
          <Appear delay={0.16}>
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-muted sm:text-base">
              {availablePrograms.length} of the {programs.length} programs listed here are open for enrolment today. The other {unavailablePrograms.length} are
              marked Not available: they are named so you can find them, but there is nothing to enrol in yet.
            </p>
          </Appear>
          <Appear delay={0.22} className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold">
            <Link href="/tracks" className="text-red-deep underline underline-offset-4 hover:text-red-press">Compare the five 30-day career tracks</Link>
            <Link href="/training-solutions" className="text-red-deep underline underline-offset-4 hover:text-red-press">Training a team? See training solutions</Link>
          </Appear>
        </div>
      </section>

      <section aria-label="Browse by role or industry" className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <Discovery />
      </section>

      <section aria-label="All programs" className="mx-auto max-w-7xl px-4 pt-4 pb-16 sm:px-6 sm:pb-24">
        <ProgramGroups list={programs} />
      </section>
    </>
  );
}
