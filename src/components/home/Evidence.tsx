import { evidence } from "@/data/program";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SourceLink } from "@/components/ui/SourceLink";

export function Evidence() {
  return (
    <section aria-labelledby="evidence-title" className="border-b-2 border-line">
      <div className="mx-auto max-w-7xl px-4 pt-14 sm:px-6">
        <Eyebrow>Why now</Eyebrow>
        <h2 id="evidence-title" className="display mt-3 max-w-3xl text-4xl sm:text-5xl">The work is changing. The evidence is public.</h2>
      </div>
      <div className="mx-auto mt-10 grid max-w-7xl border-t-2 border-line md:grid-cols-3">
        {evidence.map((e, i) => (
          <div key={e.figure} className={`flex flex-col gap-3 px-4 py-10 sm:px-6 ${i < evidence.length - 1 ? "border-b-2 border-line md:border-b-0 md:border-r-2" : ""}`}>
            <p className="display text-6xl text-red">{e.figure}</p>
            <p className="text-base text-pretty">{e.claim}</p>
            <div className="mt-auto pt-2"><SourceLink source={e.source} /></div>
          </div>
        ))}
      </div>
    </section>
  );
}
