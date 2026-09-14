import { outcomes } from "@/data/program";
import { SectionHeader } from "@/components/ui/SectionHeader";

export function Outcomes() {
  return (
    <section aria-labelledby="outcomes-title" className="border-b-2 border-line py-14 sm:py-20">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.4fr]">
        <SectionHeader id="outcomes-title" eyebrow="Outcomes" title="What you walk away able to do." intro="Practical ability and evidence — not a certificate that promises a job. No program can guarantee employment, and we don't." />
        <ul className="border-t-2 border-line">
          {outcomes.map((o, i) => (
            <li key={o} className="flex items-baseline gap-5 border-b-2 border-line py-5">
              <span className="display w-10 text-2xl text-red">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-xl font-bold">{o}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
