import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SourceLink } from "@/components/ui/SourceLink";
import { Appear } from "@/components/motion/Appear";
import { approach, principles } from "@/data/public-story";
import { evidence, sectionCopy, statementSupport } from "@/data/program";

export const metadata: Metadata = {
  title: "Why Klymb",
  description: "Why Klymb teaches through real workplace problems and the work you keep, not videos and certificates.",
};

export default function WhyKlymbPage() {
  return (
    <>
      <PageHeader
        eyebrow="Why Klymb"
        title="Your work is the proof."
        intro={statementSupport}
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/tracks" soft arrow>Choose my career track</ButtonLink>
          <ButtonLink href="/organizations" variant="secondary" soft>For organizations</ButtonLink>
        </div>
      </PageHeader>

      <Container className="py-14 sm:py-20">
        <SectionHeader id="shift-title" eyebrow={sectionCopy.evidence.eyebrow} title={sectionCopy.evidence.title} intro={sectionCopy.evidence.intro} />
        <ul className="mt-10 grid gap-5 sm:grid-cols-3">
          {evidence.map((item, i) => (
            <li key={item.figure}>
              <Appear delay={i * 0.06} className="h-full">
                <div className="card flex h-full flex-col p-7">
                  <p className="display text-5xl text-red-strong nums">{item.figure}</p>
                  <p className="mt-4 flex-1 text-sm leading-relaxed text-muted">{item.claim}</p>
                  <p className="mt-4"><SourceLink source={item.source} /></p>
                </div>
              </Appear>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted">These are figures from other organizations&apos; published reports, linked above. They are not Klymb results.</p>
      </Container>

      <section aria-labelledby="differs-title" className="border-y border-line/25 bg-white">
        <Container className="py-14 sm:py-20">
          <SectionHeader id="differs-title" eyebrow="What we do instead" title="You do the work of the role." intro="Each day is one realistic problem. You build it, keep it in your own repository and explain it. That is the whole method." />
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {approach.map((step, i) => (
              <li key={step.title} className="card flex gap-4 p-6">
                <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-ink text-sm font-bold text-white">{i + 1}</span>
                <div>
                  <h3 className="font-extrabold">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <Container className="py-14 sm:py-20">
        <SectionHeader id="promise-title" eyebrow="How we stay honest" title="What we promise, and what we don't." />
        <ul className="mt-10 grid gap-5 md:grid-cols-3">
          {principles.map((p) => (
            <li key={p.title} className="border-l-4 border-red-strong pl-5">
              <h3 className="display text-xl">{p.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{p.body}</p>
            </li>
          ))}
        </ul>
      </Container>

      <section aria-labelledby="next-title" className="bg-night text-white">
        <Container className="flex flex-col gap-6 py-14 sm:py-16 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 id="next-title" className="display text-3xl text-balance sm:text-4xl">Pick a role and start with Day 1.</h2>
            <p className="mt-3 text-white/75">Or <Link href="/organizations" className="font-semibold text-white underline underline-offset-4">see how teams use Klymb</Link>.</p>
          </div>
          <ButtonLink href="/tracks" variant="inverse" soft arrow>Choose my career track</ButtonLink>
        </Container>
      </section>
    </>
  );
}
