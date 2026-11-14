import type { Metadata } from "next";
import Link from "next/link";
import { AskUs } from "@/components/catalog/AskUs";
import { StatusBadge } from "@/components/catalog/StatusBadge";
import { Appear } from "@/components/motion/Appear";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { availableIn, contactMailto, industries, programsForIndustry, programsForRole, roles, type Program } from "@/data/catalog";

export const metadata: Metadata = {
  title: "Training solutions for teams",
  description: "What a company can do with Klymb.ai today, by industry and by role, and what is not available yet.",
};

/** The one course a company can assign. Everything else a team takes, each person enrols in on their own. */
const ASSIGNABLE = "system-design";

const worksToday = [
  "A company workspace: HR, team heads and employees each see what their role needs. People the company has invited sign in with a 6-digit code sent to their email.",
  "HR can assign System Design to named people, or to everyone who does not have it yet, and take it back. An assigned person opens the course with the Google account that matches the email they were invited on.",
  "A learning page for HR and team heads: who has the course, which lessons they have passed and their final-assessment scores.",
];

const notAvailable = [
  "Assigning anything other than System Design, including the 30-day career tracks",
  "Company reports and exports, certificates, and single sign-on",
  "Reminder or release emails for people a company has assigned",
  "Training built for a single industry",
];

function Names({ list }: { list: Program[] }) {
  return (
    <>
      {list.map((p, i) => (
        <span key={p.slug}>
          {i > 0 && ", "}
          <Link href={`/courses/${p.slug}`} className="font-bold text-red-deep underline underline-offset-4 hover:text-red-press">{p.name}</Link>
        </span>
      ))}
    </>
  );
}

/** What a team gets for one industry or role: the open programs and how far a company can take them, or a plain no. */
function TeamCard({ title, href, list, subject }: { title: string; href: string; list: Program[]; subject: string }) {
  const open = availableIn(list);
  const assignable = open.filter((p) => p.slug === ASSIGNABLE);
  const selfEnrol = open.filter((p) => p.slug !== ASSIGNABLE);
  return (
    <li>
      <article className={open.length ? "card flex h-full flex-col gap-3 rounded-card p-6" : "flex h-full flex-col gap-3 rounded-card border-2 border-dashed border-line/50 p-6"}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="display text-xl"><Link href={href} className="hover:text-red-deep">{title}</Link></h3>
          <StatusBadge status={open.length ? "available" : "unavailable"} />
        </div>
        {open.length ? (
          <>
            {assignable.length > 0 && (
              <p className="text-[15px] leading-relaxed">
                <span className="font-bold">A company can assign:</span> <Names list={assignable} />
              </p>
            )}
            {selfEnrol.length > 0 && (
              <p className="text-[15px] leading-relaxed text-muted">
                <span className="font-bold text-ink">People can enrol themselves:</span> <Names list={selfEnrol} />. A company cannot assign these or see progress on them.
              </p>
            )}
          </>
        ) : (
          <p className="text-[15px] leading-relaxed text-muted">
            No training for this exists yet. <a href={contactMailto(subject)} className="font-bold text-red-deep underline underline-offset-4">Email us what your team needs.</a>
          </p>
        )}
      </article>
    </li>
  );
}

export default function TrainingSolutionsPage() {
  return (
    <>
      <section aria-labelledby="ts-title" className="mx-auto max-w-7xl px-4 pb-6 sm:px-6">
        <div className="card rounded-slab p-8 shadow-float sm:p-12 lg:p-16">
          <Appear><Eyebrow>Training solutions · for teams</Eyebrow></Appear>
          <Appear delay={0.08} y={24}>
            <h1 id="ts-title" className="display mt-5 max-w-3xl text-[clamp(2.4rem,6vw,4.25rem)] text-balance">
              Training a team? Here is <span className="text-red-strong">what works today.</span>
            </h1>
          </Appear>
          <Appear delay={0.16}>
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-muted sm:text-base">
              One course can be assigned to a company&apos;s people today, as a pilot. Everything else a team takes, each person enrols in on their
              own. This page says which is which, by industry and by role.
            </p>
          </Appear>
          <Appear delay={0.22} className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold">
            <a href="#by-industry" className="text-red-deep underline underline-offset-4 hover:text-red-press">By industry</a>
            <a href="#by-role" className="text-red-deep underline underline-offset-4 hover:text-red-press">By role</a>
            <Link href="/courses" className="text-red-deep underline underline-offset-4 hover:text-red-press">Browse all courses</Link>
          </Appear>
        </div>
      </section>

      <section aria-labelledby="today-title" className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <Eyebrow>What works today</Eyebrow>
            <h2 id="today-title" className="display mt-2 text-[clamp(1.5rem,3vw,2.1rem)]">The company workspace.</h2>
            <ul className="mt-6 divide-y divide-line/25 border-y border-line/25">
              {worksToday.map((t) => (
                <li key={t} className="flex gap-3 py-3 text-[15px] leading-relaxed">
                  <span aria-hidden="true" className="text-red-strong">✓</span>{t}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Workspaces are set up by Klymb: a company cannot create its own. People a company has already invited can sign in at{" "}
              <Link href="/org/sign-in" className="font-bold text-red-deep underline underline-offset-4">company sign-in</Link>.
            </p>
          </div>
          <div>
            <Eyebrow tone="muted">Not available</Eyebrow>
            <h2 className="display mt-2 text-[clamp(1.5rem,3vw,2.1rem)]">What a company cannot do yet.</h2>
            <ul className="mt-6 divide-y divide-line/25 border-y border-line/25">
              {notAvailable.map((t) => (
                <li key={t} className="flex gap-3 py-3 text-[15px] leading-relaxed text-muted">
                  <span aria-hidden="true">×</span>{t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="by-industry" aria-labelledby="ind-title" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-10 sm:px-6">
        <Eyebrow>By industry</Eyebrow>
        <h2 id="ind-title" className="display mt-2 text-[clamp(1.5rem,3vw,2.1rem)]">Which industry is your team in?</h2>
        <ul className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {industries.map((i) => (
            <TeamCard key={i.slug} title={i.name} href={`/courses/industries/${i.slug}`} list={programsForIndustry(i.slug)} subject={`Team training for ${i.name}`} />
          ))}
        </ul>
      </section>

      <section id="by-role" aria-labelledby="role-title" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-10 sm:px-6">
        <Eyebrow>By role</Eyebrow>
        <h2 id="role-title" className="display mt-2 text-[clamp(1.5rem,3vw,2.1rem)]">What job does your team do?</h2>
        <ul className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {roles.map((r) => (
            <TeamCard key={r.slug} title={r.name} href={`/courses/roles/${r.slug}`} list={programsForRole(r.slug)} subject={`Team training for ${r.name}`} />
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-6 pb-16 sm:px-6 sm:pb-24">
        <AskUs dark subject="Training for my team" title="Want a workspace, or something not listed?">
          <p>
            Email us how many people, which roles and which industry, so we know what you are looking for. An email does not reserve
            seats or start a program, and we cannot promise a date.
          </p>
        </AskUs>
      </section>
    </>
  );
}
