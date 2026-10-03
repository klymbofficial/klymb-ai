import { howItWorks, sectionCopy } from "@/data/program";
import { Eyebrow } from "@/components/ui/Eyebrow";

/**
 * The server-rendered stand-in for HowItWorks: same box and height, every
 * step readable (and indexable), no JavaScript. The interactive version takes
 * its place as the reader scrolls near.
 */
export function HowItWorksStatic() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="mx-auto max-w-[92rem] px-4 py-8 sm:px-6 lg:px-8 lg:py-0">
      <div className="lg:h-[300vh]">
        <div className="lg:sticky lg:top-0 lg:flex lg:h-dvh lg:py-4">
          <div className="card flex w-full flex-col justify-center rounded-slab p-8 sm:p-10 lg:px-16 lg:py-9">
            <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr] lg:items-center">
              <ol className="flex flex-col gap-4">
                {howItWorks.map((step, i) => (
                  <li key={step.title} className="flex items-start gap-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink text-sm font-bold text-white">{i + 1}</span>
                    <span>
                      <span className="block font-extrabold">{step.title}</span>
                      <span className="text-sm text-muted">{step.body}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <div className="lg:text-right">
                <Eyebrow>{sectionCopy.howItWorks.eyebrow}</Eyebrow>
                <h2 id="how-title" className="display mt-4 text-[clamp(2rem,min(4.4vw,7.2vh),5.25rem)] text-balance">{sectionCopy.howItWorks.title}</h2>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
