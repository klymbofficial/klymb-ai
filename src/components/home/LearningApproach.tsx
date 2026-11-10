import { Appear } from "@/components/motion/Appear";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { approach } from "@/data/public-story";

/**
 * How learning works, in six plain steps. Each step is something a learner
 * can do in the product today. (Replaces the scroll-driven How it works.)
 */
export function LearningApproach() {
  return (
    <section id="how-it-works" aria-labelledby="approach-title" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-14 sm:px-6 sm:py-20">
      <Appear className="max-w-2xl">
        <Eyebrow>How learning works</Eyebrow>
        <h2 id="approach-title" className="display mt-3 text-[clamp(1.9rem,4vw,2.9rem)] text-balance">
          30 days, <span className="text-red-strong">one problem at a time.</span>
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-muted text-pretty">
          Not a video course. You do the work of the role, keep it in your own repository and finish with something you can explain.
        </p>
      </Appear>

      <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {approach.map((step, i) => (
          <li key={step.title}>
            <Appear delay={i * 0.05} className="h-full">
              <div className="card flex h-full gap-4 p-6">
                <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-ink text-sm font-bold text-white">{i + 1}</span>
                <div>
                  <h3 className="font-extrabold">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.body}</p>
                </div>
              </div>
            </Appear>
          </li>
        ))}
      </ol>
    </section>
  );
}
