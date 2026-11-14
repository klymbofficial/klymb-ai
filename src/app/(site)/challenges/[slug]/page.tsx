import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Appear } from "@/components/motion/Appear";
import { ButtonLink } from "@/components/ui/Button";
import { ClaudeChallenge } from "@/components/challenge/ClaudeChallenge";
import { libraryCourses } from "@/data/course-cards";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { getCurriculum } from "@/data/curricula";
import { trackImages } from "@/data/track-images";
import { challenges, getTrack } from "@/data/tracks";

export function generateStaticParams() {
  return challenges.map((c) => ({ slug: c.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = getTrack((await params).slug);
  return c ? { title: `${c.name}: 60-day challenge`, description: c.description } : {};
}

const STEPS = [
  ["A task a day", "Each day opens once the one before is submitted: a scoped task that takes under an hour."],
  ["Build in public", "Push the work to your GitHub repository and post about it on LinkedIn. Both links are your submission."],
  ["A quiz each week", "A short multiple-choice quiz at the end of the week, marked straight away with the reasons."],
  ["Badges to share", "First day, seven days, halfway and the finish, each a badge you can post."],
] as const;

/** One challenge: what it builds, how the days work, and every week's tasks. */
export default async function ChallengePage({ params }: { params: Promise<{ slug: string }> }) {
  const c = getTrack((await params).slug);
  const course = c?.kind === "challenge" ? getCurriculum(c.slug) : null;
  if (!c || !course) notFound();
  const start = `/register?track=${c.slug}`;

  // The Claude challenge has its own page, from the Claude Design file "Klymb Claude Challenge".
  if (c.slug === "claude") return <ClaudeChallenge weeks={course.modules.map((m) => m.name)} start={start} facts={libraryCourses.find((l) => l.slug === "claude")?.card ?? null} />;

  return (
    <>
      <section aria-labelledby="challenge-title" className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
        <div className="card overflow-hidden rounded-slab shadow-float">
          <div className="grid lg:grid-cols-[1.15fr_1fr]">
            <div className="p-8 sm:p-12 lg:p-14">
              <Appear><span className="text-xs font-extrabold uppercase tracking-[0.16em] text-red-deep">60-day challenge</span></Appear>
              <Appear delay={0.08} y={24}><h1 id="challenge-title" className="display mt-4 text-[clamp(2.4rem,6vw,4rem)]">{c.name}</h1></Appear>
              <Appear delay={0.16}><p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted sm:text-base">{c.description}</p></Appear>
              <Appear delay={0.24} className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href={start} soft arrow>Start this challenge</ButtonLink>
                <ButtonLink href="#weeks" variant="secondary" soft className="border-line hover:bg-ink">See the 60 days</ButtonLink>
              </Appear>
              <Appear delay={0.28}>
                <ul className="mt-6 flex flex-wrap gap-1.5">
                  {c.skills.map((s) => <li key={s} className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold">{s}</li>)}
                </ul>
              </Appear>
            </div>
            <div className="relative min-h-[16rem] overflow-hidden bg-night lg:min-h-full">
              <Image src={trackImages[c.slug].src} alt={trackImages[c.slug].alt} fill sizes="(min-width: 1024px) 45vw, 100vw" placeholder="blur" className="object-cover" priority />
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="how-title" className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <Eyebrow>How it works</Eyebrow>
        <h2 id="how-title" className="display mt-3 text-[clamp(1.75rem,3.6vw,2.6rem)]">Start any day. Go at your own pace.</h2>
        <ol className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="card p-6">
              <span className="text-sm font-bold text-red-strong nums">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-2 text-lg font-extrabold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10">
          <h3 className="text-xl font-bold">By the end, you will</h3>
          <ul className="mt-4 space-y-2 text-[15px]">
            {c.outcomes.map((o) => <li key={o} className="flex gap-2.5"><span aria-hidden="true" className="text-red-strong">→</span>{o}</li>)}
          </ul>
        </div>
      </section>

      <section id="weeks" aria-labelledby="weeks-title" className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-6 pb-16 sm:px-6 sm:pb-24">
        <Eyebrow>The 60 days</Eyebrow>
        <h2 id="weeks-title" className="display mt-3 text-[clamp(1.75rem,3.6vw,2.6rem)]">Every day, planned.</h2>
        <div className="mt-8 flex flex-col gap-3">
          {course.modules.map((m) => {
            const days = course.days.filter((d) => d.week === m.week);
            return (
              <details key={m.week} className="card group px-6 py-4 open:pb-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-1">
                  <span>
                    <span className="block text-xs font-extrabold uppercase tracking-[0.14em] text-muted">Week {m.week} · {m.days}</span>
                    <span className="mt-1 block text-lg font-extrabold">{m.name}</span>
                  </span>
                  <span aria-hidden="true" className="text-xl text-muted transition-transform group-open:rotate-45">+</span>
                </summary>
                <ol className="mt-4 divide-y divide-line/20 border-t border-line/20">
                  {days.map((d) => (
                    <li key={d.day} className="flex items-baseline gap-4 py-2.5 text-[15px]">
                      <span className="w-14 shrink-0 text-sm font-bold text-red-strong nums">Day {d.day}</span>
                      <span>{d.title}</span>
                    </li>
                  ))}
                </ol>
              </details>
            );
          })}
        </div>
        <div className="mt-10"><ButtonLink href={start} soft arrow>Start this challenge</ButtonLink></div>
      </section>
    </>
  );
}
