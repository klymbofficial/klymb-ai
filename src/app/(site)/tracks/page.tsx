import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { TrackGrid } from "@/components/track/TrackGrid";
import { tracks } from "@/data/tracks";

export const metadata: Metadata = { title: "Career Tracks" };

export default function TracksPage() {
  return (
    <>
      <PageHeader eyebrow="Career tracks" title="Choose the role you want next." intro="Every track follows the same 30-day structure with problems, assessments and interview preparation specific to that role." />
      <section className="py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6"><TrackGrid /></div>
      </section>
      <section aria-labelledby="compare-title" className="border-t-2 border-line py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 id="compare-title" className="display text-4xl">Compare tracks</h2>
          <div className="mt-8 overflow-x-auto border-2 border-line">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-ink text-paper">
                <tr>
                  <th scope="col" className="p-4">Track</th>
                  <th scope="col" className="p-4">Heading to</th>
                  <th scope="col" className="p-4">Week 1 focus</th>
                  <th scope="col" className="p-4">Projects</th>
                </tr>
              </thead>
              <tbody>
                {tracks.map((t) => (
                  <tr key={t.slug} className="border-t-2 border-line align-top">
                    <th scope="row" className="p-4"><Link href={`/tracks/${t.slug}`} className="text-base font-extrabold underline underline-offset-4 hover:text-red-deep">{t.name}</Link></th>
                    <td className="p-4 font-semibold text-red-deep">{t.becomes}</td>
                    <td className="p-4">{t.weeks[0].title}</td>
                    <td className="p-4">{t.projects.join("; ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
