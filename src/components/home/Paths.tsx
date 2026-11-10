import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Appear } from "@/components/motion/Appear";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { learnerPath, orgPath } from "@/data/public-story";

/**
 * Right under the hero: who Klymb is for, as two clearly different doors. A
 * person goes to the tracks; a company goes to the organizations page. Each
 * card has its own colour and its own primary action.
 */
export function Paths() {
  return (
    <section aria-labelledby="paths-title" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
      <Appear className="max-w-2xl">
        <Eyebrow>Where to start</Eyebrow>
        <h2 id="paths-title" className="display mt-3 text-[clamp(1.9rem,4vw,2.9rem)] text-balance">
          Learning for one person, <span className="text-red-strong">or for a whole team.</span>
        </h2>
      </Appear>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        <Appear delay={0.05} className="flex">
          <article aria-labelledby="path-learner" className="card flex flex-1 flex-col p-7 sm:p-9">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-muted">{learnerPath.eyebrow}</p>
            <h3 id="path-learner" className="display mt-4 text-3xl text-balance">{learnerPath.title}</h3>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">{learnerPath.body}</p>
            <ul className="mt-6 space-y-2.5 text-[15px]">
              {learnerPath.points.map((t) => (
                <li key={t} className="flex gap-2.5"><Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-red-strong" />{t}</li>
              ))}
            </ul>
            <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-3 pt-8">
              <Link href={learnerPath.cta.href} className="inline-flex min-h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg sm:w-auto bg-red-strong px-6 py-3 text-sm font-bold text-white transition-[background-color,transform] duration-150 hover:bg-red-press active:scale-[0.97]">
                {learnerPath.cta.label} <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <Link href={learnerPath.secondary.href} className="inline-flex min-h-11 items-center justify-center px-2 text-sm font-semibold underline underline-offset-4 hover:text-red-deep">
                {learnerPath.secondary.label}
              </Link>
            </div>
          </article>
        </Appear>

        <Appear delay={0.12} className="flex">
          <article aria-labelledby="path-org" className="flex flex-1 flex-col rounded-slab bg-night p-7 text-white shadow-card sm:p-9">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-white/70">{orgPath.eyebrow}</p>
            <h3 id="path-org" className="display mt-4 text-3xl text-balance">{orgPath.title}</h3>
            <p className="mt-3 text-[15px] leading-relaxed text-white/80">{orgPath.body}</p>
            <ul className="mt-6 space-y-2.5 text-[15px]">
              {orgPath.points.map((t) => (
                <li key={t} className="flex gap-2.5"><Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-red-soft" />{t}</li>
              ))}
            </ul>
            <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-3 pt-8">
              <Link href={orgPath.cta.href} className="inline-flex min-h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg sm:w-auto border-2 border-white px-6 py-3 text-sm font-bold text-white transition-[background-color,color,transform] duration-150 hover:bg-white hover:text-ink active:scale-[0.97]">
                {orgPath.cta.label} <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <Link href={orgPath.secondary.href} className="inline-flex min-h-11 items-center justify-center px-2 text-sm font-semibold text-white/80 underline underline-offset-4 hover:text-white">
                {orgPath.secondary.label}
              </Link>
            </div>
          </article>
        </Appear>
      </div>
    </section>
  );
}
