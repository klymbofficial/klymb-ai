import { whyRefund } from "@/data/program";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Appear } from "@/components/motion/Appear";

/** The frank explanation of the pricing model, and what we will not do. */
export function WhyRefund() {
  return (
    <section aria-labelledby="why-refund-title" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
      <SectionHeader id="why-refund-title" eyebrow="The honest part" title={whyRefund.title} intro={whyRefund.intro} />
      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        {whyRefund.points.map((p, i) => (
          <Appear key={p.title} delay={i * 0.06} className="card rounded-card p-6">
            <p className="display text-3xl text-red-strong nums">0{i + 1}</p>
            <h3 className="mt-3 text-lg font-extrabold">{p.title}</h3>
            <p className="mt-2 text-muted">{p.body}</p>
          </Appear>
        ))}
      </div>
      <Appear className="mt-4 rounded-card bg-ink p-6 text-paper sm:p-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-paper/70">What we will not do</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {whyRefund.promises.map((line) => (
            <li key={line} className="flex gap-3">
              <svg className="mt-1 size-4 shrink-0 text-red-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
              {line}
            </li>
          ))}
        </ul>
      </Appear>
    </section>
  );
}
