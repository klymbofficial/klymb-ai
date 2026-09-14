import Link from "next/link";
import { hero } from "@/data/program";
import { tracks } from "@/data/tracks";
import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="border-b-2 border-line">
      <div className="mx-auto grid max-w-7xl lg:grid-cols-[1.25fr_1fr]">
        <div className="px-4 py-14 sm:px-6 sm:py-20 lg:py-24">
          <Eyebrow>{hero.eyebrow}</Eyebrow>
          <h1 id="hero-title" className="display mt-5 text-[clamp(3rem,8vw,6.25rem)] text-balance">
            Become Job-Ready in <span className="text-red">30&nbsp;Days</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted sm:text-xl text-pretty">{hero.subheadline}</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href={hero.primaryCta.href} arrow>{hero.primaryCta.label}</ButtonLink>
            <ButtonLink href={hero.secondaryCta.href} variant="secondary">{hero.secondaryCta.label}</ButtonLink>
          </div>
        </div>

        <div className="border-t-2 border-line bg-ink text-paper lg:border-t-0 lg:border-l-2">
          <div className="px-4 py-8 sm:px-6">
            <Eyebrow tone="light">Where your role is heading</Eyebrow>
          </div>
          <ol className="border-t border-white/20">
            {tracks.map((t, i) => (
              <li key={t.slug} className="border-b border-white/20">
                <Link href={`/tracks/${t.slug}`} className="group flex items-center gap-4 px-4 py-4 hover:bg-white/5 sm:px-6">
                  <span className="display w-8 text-xl text-red">{String(i + 1).padStart(2, "0")}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-extrabold">{t.name}</span>
                    <span className="block truncate text-sm text-white/65">→ {t.becomes}</span>
                  </span>
                  <svg className="shrink-0 transition-transform group-hover:translate-x-1" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
