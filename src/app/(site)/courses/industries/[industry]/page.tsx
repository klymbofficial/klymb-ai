import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AskUs } from "@/components/catalog/AskUs";
import { Discovery } from "@/components/catalog/Discovery";
import { ProgramGrid, ProgramGroups } from "@/components/catalog/ProgramGroups";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { availableIn, availablePrograms, getIndustry, industries, programsForIndustry } from "@/data/catalog";

export function generateStaticParams() {
  return industries.map((i) => ({ industry: i.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ industry: string }> }): Promise<Metadata> {
  const industry = getIndustry((await params).industry);
  if (!industry) return {};
  return { title: `${industry.name} courses`, description: `Klymb.ai courses for ${industry.name.toLowerCase()}: what is open for enrolment and what is not available.` };
}

export default async function IndustryPage({ params }: { params: Promise<{ industry: string }> }) {
  const industry = getIndustry((await params).industry);
  if (!industry) notFound();
  const list = programsForIndustry(industry.slug);
  const sectorSpecific = industry.slug !== "any-industry";
  const noneOpen = availableIn(list).length === 0;
  // A sector page with nothing open still shows what a person in that sector can take today.
  const roleBased = availablePrograms.filter((p) => p.industries.includes("any-industry"));

  return (
    <>
      <section aria-labelledby="industry-title" className="mx-auto max-w-7xl px-4 pb-6 sm:px-6">
        <div className="card rounded-slab p-8 shadow-float sm:p-12">
          <nav aria-label="Breadcrumb" className="text-sm font-semibold text-muted">
            <Link href="/courses" className="hover:text-red-deep hover:underline">Courses</Link> <span aria-hidden="true">/</span> By industry
          </nav>
          <Eyebrow className="mt-5">Industry</Eyebrow>
          <h1 id="industry-title" className="display mt-3 text-[clamp(2.1rem,5vw,3.5rem)] text-balance">{industry.name}</h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted sm:text-base">{industry.blurb}</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <ProgramGroups
          list={list}
          emptyOpen={`No program built for ${industry.name.toLowerCase()} is open for enrolment.`}
        />
        {sectorSpecific && noneOpen && (
          <>
            <AskUs className="mt-10" subject={`Courses for ${industry.name}`} title={`Need training for ${industry.name.toLowerCase()}?`}>
              <p>
                Nothing built for this industry exists yet, so there is nothing to enrol in or try. If you or your team need it, email us what
                you are looking for.
              </p>
            </AskUs>
            <div className="mt-14">
              <h2 className="display text-[clamp(1.5rem,3vw,2rem)]">Open today, for any industry</h2>
              <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
                These teach the work of a role. None of them is specific to {industry.name.toLowerCase()}.
              </p>
              <ProgramGrid list={roleBased} />
            </div>
          </>
        )}
      </section>

      <section aria-label="Browse other roles and industries" className="mx-auto max-w-7xl px-4 pt-4 pb-16 sm:px-6 sm:pb-24">
        <Discovery active={{ kind: "industry", slug: industry.slug }} />
      </section>
    </>
  );
}
