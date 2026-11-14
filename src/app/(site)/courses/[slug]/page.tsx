import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AskUs } from "@/components/catalog/AskUs";
import { ProgramGrid } from "@/components/catalog/ProgramGroups";
import { StatusBadge } from "@/components/catalog/StatusBadge";
import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { availablePrograms, getIndustry, getProgram, getRole, programs, type Program } from "@/data/catalog";
import { enrolment } from "@/data/config";
import { BUILT_LESSONS, MODULES } from "@/data/system-design/course-app";
import { getTrack } from "@/data/tracks";
import { LESSON_COUNT } from "@/lib/course-app";
import { SD_STATS } from "@/lib/sd-offer";

export function generateStaticParams() {
  return programs.map((p) => ({ slug: p.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = getProgram((await params).slug);
  if (!p) return {};
  // A program with no course behind it stays out of search results: a visitor arriving there from a search would find nothing to take.
  return { title: p.name, description: p.summary, ...(p.status === "unavailable" && { robots: { index: false, follow: true } }) };
}

function Section({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 sm:pb-16">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 id={id} className="display mt-2 text-[clamp(1.5rem,3vw,2.1rem)] text-balance">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="divide-y divide-line/25 border-y border-line/25">
      {items.map((t) => (
        <li key={t} className="flex gap-3 py-3 text-[15px]">
          <span aria-hidden="true" className="text-red-strong">→</span>{t}
        </li>
      ))}
    </ul>
  );
}

function Facts({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
      {rows.map(([value, label]) => (
        <div key={label} className="flex flex-col gap-0.5">
          <dd className="display order-1 text-3xl text-red-strong nums">{value}</dd>
          <dt className="order-2 text-xs font-extrabold uppercase tracking-[0.12em] text-muted">{label}</dt>
        </div>
      ))}
    </dl>
  );
}

function Hero({ p, children }: { p: Program; children?: React.ReactNode }) {
  const open = p.status === "available";
  return (
    <section aria-labelledby="program-title" className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
      <div className="card rounded-slab p-8 shadow-float sm:p-12 lg:p-14">
        <nav aria-label="Breadcrumb" className="text-sm font-semibold text-muted">
          <Link href="/courses" className="hover:text-red-deep hover:underline">Courses</Link> <span aria-hidden="true">/</span> {p.name}
        </nav>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Eyebrow>{p.kind}</Eyebrow>
          <StatusBadge status={p.status} />
        </div>
        <h1 id="program-title" className="display mt-4 max-w-3xl text-[clamp(2.4rem,6vw,4.25rem)] text-balance">{p.name}</h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted sm:text-base">{p.summary}</p>
        <ul className="mt-5 flex flex-wrap gap-2" aria-label="Roles and industries">
          {p.roles.map((r) => (
            <li key={r}><Link href={`/courses/roles/${r}`} className="rounded-full bg-surface px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-red-tint hover:text-red-deep">{getRole(r)?.name}</Link></li>
          ))}
          {p.industries.map((i) => (
            <li key={i}><Link href={`/courses/industries/${i}`} className="rounded-full bg-surface px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-red-tint hover:text-red-deep">{getIndustry(i)?.name}</Link></li>
          ))}
        </ul>
        {open && p.startHref && <div className="mt-8 flex flex-col gap-3 sm:flex-row">{children}</div>}
      </div>
    </section>
  );
}

/** A career track: everything below is read from the track itself, the same data as its own page. */
function TrackProgram({ p }: { p: Program }) {
  const track = getTrack(p.track ?? "");
  if (!track || !p.startHref) notFound();
  return (
    <>
      <Hero p={p}>
        <ButtonLink href={p.startHref} soft arrow>Enrol on this track</ButtonLink>
        <ButtonLink href={`/tracks/${track.slug}`} variant="secondary" soft className="border-line hover:bg-ink">See the full 30 days</ButtonLink>
      </Hero>

      <Section id="shape" eyebrow="The format" title="30 days, built around one role.">
        <Facts rows={[["30", "days"], ["4", "weekly checkpoints"], ["2", "interview-prep days"], [enrolment.dailyTime.replace(" a day", ""), "a day"]]} />
        <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-muted">
          Heading towards <strong className="text-ink">{track.becomes}</strong>. This is a role program: it teaches the work of the role, and it is not specific to any one industry.
        </p>
      </Section>

      <Section id="weeks" eyebrow="The four weeks" title="What each week covers.">
        <ol className="grid gap-4 md:grid-cols-2">
          {track.weeks.map((w) => (
            <li key={w.week} className="card rounded-card p-6">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">Week {w.week} · checkpoint after Day {w.assessment.afterDay}</p>
              <h3 className="display mt-2 text-xl">{w.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{w.focus}</p>
            </li>
          ))}
        </ol>
      </Section>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-12 sm:px-6 sm:pb-16 lg:grid-cols-2 lg:gap-16">
        <section aria-labelledby="who">
          <Eyebrow>Who it is for</Eyebrow>
          <h2 id="who" className="display mt-2 text-[clamp(1.5rem,3vw,2.1rem)]">Built for people like you.</h2>
          <div className="mt-6"><Bullets items={track.whoItsFor} /></div>
        </section>
        <section aria-labelledby="outcomes">
          <Eyebrow>Outcomes</Eyebrow>
          <h2 id="outcomes" className="display mt-2 text-[clamp(1.5rem,3vw,2.1rem)]">What you will be able to do.</h2>
          <div className="mt-6"><Bullets items={track.outcomes} /></div>
        </section>
      </div>

      <Section id="projects" eyebrow="Role-specific projects" title="Evidence you can show.">
        <ol className="space-y-3">
          {track.projects.map((pr, i) => (
            <li key={pr} className="flex items-baseline gap-4">
              <span className="text-sm font-bold text-red-strong nums">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-[15px] font-medium">{pr}</span>
            </li>
          ))}
        </ol>
      </Section>

      <TeamsNote />
    </>
  );
}

/** System Design: the facts come from the course's own data, including how much of it is live. */
function SystemDesignProgram({ p }: { p: Program }) {
  if (!p.startHref) notFound();
  const live = new Set(BUILT_LESSONS);
  return (
    <>
      <Hero p={p}>
        <ButtonLink href={p.startHref} soft arrow>See the course and enrol</ButtonLink>
      </Hero>

      <Section id="shape" eyebrow="The format" title="Short lessons, a few minutes of your day.">
        <Facts rows={SD_STATS.map(([value, label]) => [value, label] as [string, string])} />
        <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-muted">
          Video lessons in Hinglish, each followed by a short check, then a final assessment.{" "}
          {BUILT_LESSONS.length >= LESSON_COUNT ? (
            <strong className="text-ink">All {LESSON_COUNT} lessons are live.</strong>
          ) : (
            <>
              It is early access: <strong className="text-ink">{BUILT_LESSONS.length} of {LESSON_COUNT} lessons are live</strong>, and the rest are added as they are ready.
            </>
          )}
        </p>
      </Section>

      <Section id="parts" eyebrow="The 21 days" title="Three parts.">
        <ol className="grid gap-4 md:grid-cols-3">
          {MODULES.map((m, mi) => {
            const liveHere = m.lessons.filter((_, li) => live.has(`${mi}-${li}`)).length;
            return (
              <li key={m.title} className="card rounded-card p-6">
                <h3 className="display text-xl">{m.title}</h3>
                <p className="mt-1 text-xs font-bold text-muted">{liveHere} of {m.lessons.length} lessons live</p>
                <ul className="mt-4 space-y-2 text-sm">
                  {m.lessons.map(([title], li) => (
                    <li key={title} className={live.has(`${mi}-${li}`) ? "" : "text-muted"}>
                      {title}
                      {!live.has(`${mi}-${li}`) && <span className="ml-1 text-xs font-bold">(not live yet)</span>}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ol>
      </Section>

      <TeamsNote />
    </>
  );
}

/** The one thing a company can do today, and where to read the rest. */
function TeamsNote() {
  return (
    <section aria-label="For teams" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 sm:pb-24">
      <p className="rounded-card bg-surface/70 px-5 py-4 text-[15px] leading-relaxed text-muted">
        Training a team? What a company can and cannot do today is set out on the{" "}
        <Link href="/training-solutions" className="font-bold text-red-deep underline underline-offset-4">training solutions page</Link>.
      </p>
    </section>
  );
}

/** A program that is not built: say so, then give the way to ask and what can be taken today. */
function UnavailableProgram({ p }: { p: Program }) {
  const sameRole = availablePrograms.filter((a) => a.roles.some((r) => p.roles.includes(r)));
  return (
    <>
      <Hero p={p} />

      <section aria-labelledby="status" className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
        <h2 id="status" className="display text-[clamp(1.5rem,3vw,2.1rem)]">What exists today.</h2>
        <ul className="mt-5 max-w-2xl divide-y divide-line/25 border-y border-line/25 text-[15px]">
          <li className="py-3">There is no course, curriculum or lesson for {p.name}.</li>
          <li className="py-3">You cannot enrol, join a waitlist or book a trial session on this site.</li>
          <li className="py-3">No date has been set, so we do not give one.</li>
        </ul>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
        <AskUs subject={`Interested in ${p.name}`} title="Tell us what you need.">
          <p>
            If you or your team want {p.name}, email us with the role, the industry and roughly how many people. An email does not reserve a
            place or start a program, and we cannot promise one, or a date.
          </p>
        </AskUs>
      </section>

      <section aria-labelledby="meanwhile" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 sm:pb-24">
        <h2 id="meanwhile" className="display text-[clamp(1.5rem,3vw,2.1rem)]">
          {sameRole.length ? "Open for enrolment in the same field" : "Open for enrolment today"}
        </h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
          {sameRole.length
            ? "These are open now and are for the same kind of role."
            : "None of these is specific to this subject. They teach the work of a role and are open now."}
        </p>
        <ProgramGrid list={sameRole.length ? sameRole : availablePrograms} />
      </section>
    </>
  );
}

export default async function ProgramPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = getProgram((await params).slug);
  if (!p) notFound();
  if (p.status === "unavailable") return <UnavailableProgram p={p} />;
  return p.track ? <TrackProgram p={p} /> : <SystemDesignProgram p={p} />;
}
