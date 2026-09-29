import Image from "next/image";
import { hero } from "@/data/program";
import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Appear } from "@/components/motion/Appear";
import { LightCanvas } from "@/components/effects/LightCanvas";
import cohortPhoto from "@/assets/hero-cohort.png";

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
      <div className="card relative overflow-hidden rounded-slab shadow-float">
        {/* A red light that leans towards the pointer; desktop only. */}
        <LightCanvas mode="beam" />
        <div className="relative grid gap-10 p-8 pb-0 sm:p-12 sm:pb-0 lg:grid-cols-[1.05fr_1fr] lg:items-end lg:gap-6 lg:p-16 lg:pb-0">
          <div className="lg:pb-16">
            <Appear><Eyebrow>{hero.eyebrow}</Eyebrow></Appear>
            <h1 id="hero-title" className="display mt-6 text-[clamp(2.75rem,6.5vw,4.75rem)]">
              <Appear delay={0.08} y={24}><span className="block">Become</span></Appear>
              <Appear delay={0.18} y={24}><span className="block text-red-strong">Job-Ready</span></Appear>
              <Appear delay={0.28} y={24}><span className="block">in 30 Days</span></Appear>
            </h1>
            <Appear delay={0.4}><p className="mt-7 max-w-lg text-[15px] leading-relaxed text-muted sm:text-base">{hero.subheadline}</p></Appear>
            <Appear delay={0.5} className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={hero.primaryCta.href} soft>{hero.primaryCta.label}</ButtonLink>
              <ButtonLink href={hero.secondaryCta.href} variant="secondary" soft className="border-line hover:bg-ink">
                {hero.secondaryCta.label}
              </ButtonLink>
            </Appear>
            <Appear delay={0.58}>
              <p className="mt-5 flex items-center gap-2 text-sm font-semibold text-ink">
                <svg className="size-4 shrink-0 text-red-strong" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true">
                  <path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3Z" /><path d="m8.5 12 2.5 2.5 4.5-5" />
                </svg>
                Complete all 30 days, get 100% of your fee back.
              </p>
            </Appear>
          </div>

          <div className="relative flex items-end justify-center">
            {/* Hand-drawn rings behind the group, as in the design. */}
            <div aria-hidden="true" className="absolute inset-x-0 bottom-8 flex items-center justify-center">
              {[1, 0.86, 0.72].map((scale) => (
                <span
                  key={scale}
                  className="ring-breathe absolute aspect-square w-[min(88%,24rem)] rounded-full border-2 border-red/25"
                  style={{ transform: `scale(${scale})` }}
                />
              ))}
            </div>
            <Appear delay={0.25} y={40} className="relative w-full max-w-md lg:max-w-none">
            <Image
              src={cohortPhoto}
              alt="Four Klymb.ai learners standing together"
              priority
              sizes="(min-width: 1024px) 40vw, 90vw"
              className="relative h-auto w-full"
            />
            </Appear>
          </div>
        </div>
      </div>
    </section>
  );
}
