import { faqs } from "@/data/program";
import { SectionHeader } from "@/components/ui/SectionHeader";

export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="border-b-2 border-line py-14 sm:py-20">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.6fr]">
        <SectionHeader id="faq-title" eyebrow="FAQ" title="Straight answers." />
        <div className="border-t-2 border-line">
          {faqs.map((f) => (
            <details key={f.question} className="group border-b-2 border-line">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-lg font-extrabold [&::-webkit-details-marker]:hidden">
                {f.question}
                <span aria-hidden="true" className="text-2xl font-black text-red transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="pb-5 text-muted">{f.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
