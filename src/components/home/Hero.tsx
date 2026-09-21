import Image from "next/image";
import { hero } from "@/data/program";
import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import cohortPhoto from "@/assets/hero-cohort.png";

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
      <div className="card overflow-hidden rounded-slab shadow-float">
        <div className="grid gap-10 p-8 pb-0 sm:p-12 sm:pb-0 lg:grid-cols-[1.05fr_1fr] lg:items-end lg:gap-6 lg:p-16 lg:pb-0">
          <div className="lg:pb-16">
            <Eyebrow>{hero.eyebrow}</Eyebrow>
            <h1 id="hero-title" className="display mt-6 text-[clamp(2.75rem,6.5vw,4.75rem)]">
              Become<br />
              <span className="text-red-strong">Job-Ready</span><br />
              in 30 Days
            </h1>
            <p className="mt-7 max-w-lg text-[15px] leading-relaxed text-muted sm:text-base">{hero.subheadline}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={hero.primaryCta.href} soft>{hero.primaryCta.label}</ButtonLink>
              <ButtonLink href={hero.secondaryCta.href} variant="secondary" soft className="border-line hover:bg-ink">
                {hero.secondaryCta.label}
              </ButtonLink>
            </div>
          </div>

          <div className="relative flex items-end justify-center">
            {/* Hand-drawn rings behind the group, as in the design. */}
            <div aria-hidden="true" className="absolute inset-x-0 bottom-8 flex items-center justify-center">
              {[1, 0.86, 0.72].map((scale) => (
                <span
                  key={scale}
                  className="absolute aspect-square w-[min(88%,24rem)] rounded-full border-2 border-red/25"
                  style={{ transform: `scale(${scale})` }}
                />
              ))}
            </div>
            <Image
              src={cohortPhoto}
              alt="Four Klymb.ai learners standing together"
              priority
              sizes="(min-width: 1024px) 40vw, 90vw"
              className="relative h-auto w-full max-w-md lg:max-w-none"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
