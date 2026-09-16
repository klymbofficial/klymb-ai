import { faqs } from "@/data/program";
import { Accordion } from "@/components/ui/Accordion";
import { SectionHeader } from "@/components/ui/SectionHeader";

export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="border-b-2 border-line py-14 sm:py-20">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.6fr]">
        <SectionHeader id="faq-title" eyebrow="FAQ" title="Straight answers." />
        <Accordion items={faqs} />
      </div>
    </section>
  );
}
