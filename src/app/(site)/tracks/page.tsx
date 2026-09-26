import type { Metadata } from "next";
import Link from "next/link";
import { Appear } from "@/components/motion/Appear";
import { TrackGrid } from "@/components/track/TrackGrid";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { tracks } from "@/data/tracks";

export const metadata: Metadata = { title: "Career Tracks" };

export default function TracksPage() {
  return (
    <>
      <section aria-labelledby="tracks-title" className="mx-auto max-w-7xl px-4 pb-6 sm:px-6">
        <div className="card rounded-slab p-8 shadow-float sm:p-12 lg:p-16">
          <Appear><Eyebrow>Career tracks</Eyebrow></Appear>
          <Appear delay={0.08} y={24}>
            <h1 id="tracks-title" className="display mt-5 max-w-3xl text-[clamp(2.4rem,6vw,4.25rem)] text-balance">
              Choose the role you want <span className="text-red-strong">next.</span>
            </h1>
          </Appear>
          <Appear delay={0.16}>
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-muted sm:text-base">
              Every track follows the same 30-day structure: a real workplace problem each day, four defended checkpoints and
              two mock interviews: with problems, projects and interview questions specific to that role.
            </p>
          </Appear>
        </div>
      </section>

      <section aria-label="All tracks" className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <TrackGrid />
      </section>

      <section id="compare" aria-labelledby="compare-title" className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-6 pb-16 sm:px-6 sm:pb-20">
        <Eyebrow>Side by side</Eyebrow>
        <h2 id="compare-title" className="display mt-3 text-[clamp(1.75rem,3.6vw,2.6rem)]">Compare the tracks</h2>
        <Appear className="card mt-8 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-surface/70 text-xs font-bold text-muted">
                <tr>
                  <th scope="col" className="px-5 py-4">Track</th>
                  <th scope="col" className="px-5 py-4">Heading to</th>
                  <th scope="col" className="px-5 py-4">Week 1 focus</th>
                  <th scope="col" className="px-5 py-4">Projects</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/20">
                {tracks.map((t) => (
                  <tr key={t.slug} className="align-top transition-colors hover:bg-red-tint/40">
                    <th scope="row" className="px-5 py-4">
                      <Link href={`/tracks/${t.slug}`} className="text-base font-extrabold underline-offset-4 hover:text-red-deep hover:underline">{t.name}</Link>
                    </th>
                    <td className="px-5 py-4 font-semibold text-red-strong">{t.becomes}</td>
                    <td className="px-5 py-4">{t.weeks[0].title}</td>
                    <td className="px-5 py-4 text-muted">{t.projects.join("; ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Appear>
      </section>
    </>
  );
}
