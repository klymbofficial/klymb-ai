import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { brand, statement } from "@/data/program";
import { socials } from "@/data/config";
import { BUILT_LESSONS } from "@/data/system-design/course-app";
import { LESSON_COUNT } from "@/lib/course-app";
import { aboutFacts, principles, trackCount } from "@/data/public-story";

export const metadata: Metadata = {
  title: "About and mission",
  description: "What Klymb.ai is for, what it offers today and how to reach the team.",
};

export default function AboutPage() {
  return (
    <>
      <PageHeader eyebrow="About and mission" title="Help people prove what they can do." intro={`${brand.tagline} ${statement}`}>
        <div className="flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/tracks" soft arrow>Choose my career track</ButtonLink>
          <ButtonLink href="/why-klymb" variant="secondary" soft>Why Klymb</ButtonLink>
        </div>
      </PageHeader>

      <Container className="grid gap-12 py-14 sm:py-20 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <SectionHeader id="mission-title" eyebrow="Mission" title="Capability you can show." />
        </div>
        <div className="space-y-4 text-lg leading-relaxed text-muted text-pretty">
          <p>A job title says where you have been. Klymb is built for the moment a title stops being enough, when the work around you changes and you need to show what you can do now.</p>
          <p>So the 30-day tracks are made of work, not lectures: a problem, something you build, and a way to explain it. What you keep is the evidence.</p>
        </div>
      </Container>

      <section aria-labelledby="offer-title" className="border-y border-line/25 bg-white">
        <Container className="py-14 sm:py-20">
          <SectionHeader id="offer-title" eyebrow="What Klymb offers today" title="Where things stand today." />
          <ul className="mt-10 grid gap-5 md:grid-cols-3">
            <li className="card p-7">
              <h3 className="display text-xl">30-day career tracks</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{trackCount} roles, each with 30 daily problems, four checkpoints and two days of interview prep.</p>
              <Link href="/tracks" className="mt-4 inline-block text-sm font-bold underline underline-offset-4 hover:text-red-deep">See the tracks</Link>
            </li>
            <li className="card p-7">
              <h3 className="display text-xl">System Design</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">A course on system design, explained with real examples and built for interviews. {BUILT_LESSONS.length >= LESSON_COUNT ? `All ${LESSON_COUNT} lessons are live.` : `Early access: ${BUILT_LESSONS.length} of ${LESSON_COUNT} lessons are live, and the rest are added as they are ready.`}</p>
              <Link href="/system-design" className="mt-4 inline-block text-sm font-bold underline underline-offset-4 hover:text-red-deep">See the course</Link>
            </li>
            <li className="card p-7">
              <h3 className="display text-xl">Klymb for organizations</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">Companies add their people, assign System Design and follow progress.</p>
              <Link href="/organizations" className="mt-4 inline-block text-sm font-bold underline underline-offset-4 hover:text-red-deep">See how it works</Link>
            </li>
          </ul>
        </Container>
      </section>

      <Container className="py-14 sm:py-20">
        <SectionHeader id="values-title" eyebrow="How we work" title="The rules we hold ourselves to." />
        <ul className="mt-10 grid gap-5 md:grid-cols-3">
          {principles.map((p) => (
            <li key={p.title} className="border-l-4 border-red-strong pl-5">
              <h3 className="display text-xl">{p.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{p.body}</p>
            </li>
          ))}
        </ul>
      </Container>

      <section aria-labelledby="who-title" className="border-t border-line/25 bg-white">
        <Container className="grid gap-10 py-14 sm:py-20 lg:grid-cols-2">
          <div>
            <SectionHeader id="who-title" eyebrow="Who runs it" title="Klymb.ai, from India." />
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">
              Klymb.ai is a brand of {aboutFacts.registeredName}, a private limited company incorporated in {aboutFacts.country} in {aboutFacts.incorporationYear}. The full entity details are on the{" "}
              <Link href="/contact" className="font-semibold text-ink underline underline-offset-2">contact page</Link>.
            </p>
          </div>
          <div className="card p-7">
            <h3 className="display text-xl">Talk to us</h3>
            <p className="mt-2 text-sm text-muted">One address for questions about the courses, your place or your company.</p>
            <a href={`mailto:${aboutFacts.email}`} className="mt-4 inline-block text-lg font-bold underline underline-offset-4 hover:text-red-deep">{aboutFacts.email}</a>
            <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {socials.map((s) => (
                <li key={s.href}><a href={s.href} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4 hover:text-red-deep">{s.label} {s.handle}</a></li>
              ))}
            </ul>
          </div>
        </Container>
      </section>
    </>
  );
}
