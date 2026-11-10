import Link from "next/link";
import { ArrowRight, Building2, GraduationCap } from "lucide-react";
import { navLinks } from "@/data/program";
import { homeDoors, homeHero } from "@/data/public-story";
import { ProductsMenu } from "@/components/layout/ProductsMenu";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Appear } from "@/components/motion/Appear";
import { LightCanvas } from "@/components/effects/LightCanvas";

/** One side of the folder tab; `flip` mirrors it for the right-hand side. */
function TabSide({ flip }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 72 64"
      aria-hidden="true"
      className={`h-16 w-[4.5rem] shrink-0 text-card ${flip ? "-scale-x-100" : ""}`}
    >
      <path d="M0 64C18 64 24 60 30 46L44 14C49 4 55 0 72 0V64Z" fill="currentColor" />
    </svg>
  );
}

type Door = (typeof homeDoors)["individuals"];

/**
 * One audience's way in. The two doors on the first screen use this same
 * component with the same sizes and styles, so neither reads as the main
 * audience: only the words and the destinations differ.
 */
function DoorCard({ door, icon: Icon, id }: { door: Door; icon: typeof GraduationCap; id: string }) {
  return (
    <article aria-labelledby={id} className="flex flex-col rounded-card border-2 border-line/30 bg-white p-4 sm:p-6">
      <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-red-deep">
        <Icon aria-hidden="true" className="size-4" />
        {door.eyebrow}
      </p>
      <h2 id={id} className="display mt-1.5 text-lg text-balance sm:mt-2 sm:text-2xl">{door.title}</h2>
      <p className="mt-1.5 text-sm leading-snug text-muted sm:mt-2 sm:leading-relaxed">{door.body}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 sm:mt-4 sm:gap-y-2">
        <Link
          href={door.cta.href}
          className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-red-strong px-4 py-2.5 text-sm font-bold text-white transition-[background-color,transform] duration-150 hover:bg-red-press active:scale-[0.97] sm:px-5"
        >
          {door.cta.label} <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
        <Link href={door.secondary.href} className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4 hover:text-red-deep">
          {door.secondary.label}
        </Link>
      </div>
    </article>
  );
}

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="pointer-events-none relative mx-auto max-w-[92rem] px-4 pb-12 sm:px-6 lg:-mt-16 lg:px-8">
      {/* The section is raised into the header (lg:-mt-16), so its empty space
          would swallow clicks meant for the logo and the header button: only
          the tab and the card below take pointer events. */}
      {/* The folder: a tab carrying the site links rises out of the card's top
          edge. One drop-shadow on the wrapper follows the combined outline, so
          tab and card read as a single sheet with no seam between them. */}
      <div className="drop-shadow-[0_18px_36px_rgba(32,30,29,0.13)]">
      <nav aria-label="Primary" className="pointer-events-auto mx-auto hidden h-16 w-fit lg:flex">
        <TabSide />
        <ul className="-mx-px flex items-center gap-9 bg-card px-4 pt-2 text-[15px] font-semibold">
          {navLinks.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="transition-colors hover:text-red-deep">{l.label}</Link>
            </li>
          ))}
          <li><ProductsMenu /></li>
        </ul>
        <TabSide flip />
      </nav>
      {/* Sized by its content, and never taller than the screen left below
          the banner and header, so the whole folder is always in view. */}
      <div className="pointer-events-auto relative overflow-hidden rounded-slab bg-card lg:max-h-[calc(100dvh-8.75rem)]">
        {/* A red light that leans towards the pointer; desktop only. */}
        <LightCanvas mode="beam" />
        <div className="relative grid gap-4 p-4 sm:gap-8 sm:p-10 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-12 lg:px-14 lg:py-10">
          <div>
            {/* On a phone the two door labels say who each side is for, so this line waits for wider screens. */}
            <Appear className="hidden sm:block"><Eyebrow>{homeHero.eyebrow}</Eyebrow></Appear>
            <h1 id="hero-title" className="display px-1 pt-1 text-[1.75rem] sm:mt-4 sm:p-0 sm:text-[clamp(2.1rem,4.2vw,3.6rem)]">
              <Appear delay={0.08} y={24}><span className="block">{homeHero.titleLines[0]}</span></Appear>
              <Appear delay={0.18} y={24}><span className="block text-red-strong">{homeHero.titleLines[1]}</span></Appear>
            </h1>
            <Appear delay={0.3}><p className="mt-5 hidden max-w-lg text-[15px] leading-relaxed text-muted sm:block">{homeHero.body}</p></Appear>
          </div>

          {/* Two doors, same size and weight. */}
          <div className="grid gap-3 sm:gap-4">
            <Appear delay={0.2} y={24}><DoorCard door={homeDoors.individuals} icon={GraduationCap} id="door-individuals" /></Appear>
            <Appear delay={0.3} y={24}><DoorCard door={homeDoors.organizations} icon={Building2} id="door-organizations" /></Appear>
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}
