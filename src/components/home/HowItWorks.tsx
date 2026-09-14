import { howItWorks } from "@/data/program";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeader } from "@/components/ui/SectionHeader";

export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="border-b-2 border-line py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeader id="how-title" eyebrow="How it works" title="Thirty days, one problem at a time." />
        <ol className="mt-10 grid gap-0.5 border-2 border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {howItWorks.map((step, i) => (
            <li key={step.title} className="bg-paper">
              <Reveal delay={i * 60} className="flex h-full flex-col gap-3 p-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">Step {i + 1}</span>
                  {i < howItWorks.length - 1 && <span aria-hidden="true" className="text-xl font-black text-red">↓</span>}
                </div>
                <h3 className="display text-2xl">{step.title}</h3>
                <p className="text-muted">{step.body}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
