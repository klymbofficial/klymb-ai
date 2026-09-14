import { inclusions } from "@/data/program";
import { SectionHeader } from "@/components/ui/SectionHeader";

export function Inclusions() {
  return (
    <section aria-labelledby="included-title" className="border-b-2 border-line py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeader id="included-title" eyebrow="What you get" title="One track. Thirty days. Nothing vague." intro="A structured career program with a clear daily rhythm, not a library of videos." />
      </div>
      <ul className="mx-auto mt-10 grid max-w-7xl gap-0.5 border-y-2 border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
        {inclusions.map((item) => (
          <li key={item.label} className="flex gap-5 bg-paper px-4 py-7 sm:px-6">
            <span className="display w-14 shrink-0 text-5xl text-red" aria-hidden="true">{item.figure}</span>
            <span>
              <span className="block text-lg font-extrabold">{item.label}</span>
              <span className="mt-1 block text-sm text-muted">{item.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
