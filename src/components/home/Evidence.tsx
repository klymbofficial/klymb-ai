import Image from "next/image";
import { evidence, sectionCopy } from "@/data/program";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Reveal } from "@/components/ui/Reveal";
import { SourceLink } from "@/components/ui/SourceLink";
import { StatFigure } from "@/components/motion/StatFigure";
import worldRelief from "@/assets/world-relief.jpg";

export function Evidence() {
  const { eyebrow, title, intro } = sectionCopy.evidence;

  return (
    <section aria-labelledby="evidence-title" className="field relative overflow-hidden py-20 sm:py-28">
      <Image
        src={worldRelief}
        alt=""
        aria-hidden="true"
        sizes="100vw"
        className="pointer-events-none absolute top-1/2 left-1/2 w-[min(90rem,118%)] max-w-none -translate-x-1/2 -translate-y-[46%] select-none opacity-55 mix-blend-multiply"
      />
      {/* Feather the photograph's edges into the page ground. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(75%_65%_at_50%_45%,transparent_35%,var(--color-paper)_92%)]"
      />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2 id="evidence-title" className="display mt-4 text-[clamp(1.85rem,4vw,2.85rem)] text-balance">{title}</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted text-pretty">{intro}</p>
        </div>

        <ul className="mt-16 grid gap-6 sm:grid-cols-3 sm:gap-8">
          {evidence.map((item, i) => (
            <li key={item.figure} className="h-full">
              <Reveal delay={i * 90} className="frost flex h-full flex-col p-7 sm:p-8">
                <p className="display text-5xl text-red-strong nums"><StatFigure value={item.figure} /></p>
                <p className="mt-5 flex-1 text-sm leading-relaxed text-muted">{item.claim}</p>
                <p className="mt-5"><SourceLink source={item.source} /></p>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
