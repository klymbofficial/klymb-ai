import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Appear } from "@/components/motion/Appear";
import { ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { trackImages } from "@/data/track-images";
import { challenges } from "@/data/tracks";

export const metadata: Metadata = {
  title: "60-day challenges",
  description: "One scoped task a day for 60 days, built in public on GitHub and LinkedIn, with a quiz every week.",
};

/** The four 60-day challenges, side by side. */
export default function ChallengesPage() {
  return (
    <>
      <PageHeader
        eyebrow="60-day challenges"
        title="One task a day. Sixty days. In public."
        intro="Pick a skill and build it every day: a scoped task, pushed to GitHub and posted on LinkedIn, with a quiz at the end of each week. Start any day, at your own pace."
      />
      <section aria-label="All challenges" className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <ul className="grid gap-6 sm:grid-cols-2">
          {challenges.map((c, i) => (
            <li key={c.slug}>
              <Appear delay={0.05 * i} className="h-full">
                <article className="card flex h-full flex-col overflow-hidden">
                  <Link href={`/challenges/${c.slug}`} className="relative block aspect-[16/7] overflow-hidden bg-night">
                    <Image src={trackImages[c.slug].src} alt="" fill sizes="(min-width: 640px) 50vw, 100vw" placeholder="blur" className="object-cover" />
                  </Link>
                  <div className="flex flex-1 flex-col gap-4 p-7">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">60-day challenge</p>
                      <h2 className="display mt-2 text-2xl">{c.name}</h2>
                      <p className="mt-2 text-[15px] leading-relaxed text-muted">{c.description}</p>
                    </div>
                    <ul className="flex flex-wrap gap-1.5">
                      {c.skills.slice(0, 4).map((s) => <li key={s} className="rounded-md border border-line/40 px-2.5 py-1 text-xs font-semibold">{s}</li>)}
                    </ul>
                    <div className="mt-auto flex flex-wrap items-center gap-4 border-t border-line/25 pt-4">
                      <ButtonLink href={`/challenges/${c.slug}`} soft arrow className="px-5 py-2.5 text-sm">View challenge<span className="sr-only">: {c.name}</span></ButtonLink>
                    </div>
                  </div>
                </article>
              </Appear>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
