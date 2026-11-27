import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardCheck, Gavel, LineChart, Send, UserPlus, UsersRound } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { OrgEnquiryForm } from "@/components/org/OrgEnquiryForm";
import "./organizations.css";

export const metadata: Metadata = {
  title: "Klymb for organizations",
  description: "Hire with proctored tests, then upskill your teams with System Design and follow their progress.",
};

/** The illustration's people: initials, team, and how far up they climb (percent). */
const climbers = [
  { i: "PS", team: "a", h: 88 },
  { i: "AK", team: "b", h: 54 },
  { i: "RM", team: "a", h: 72 },
  { i: "NJ", team: "c", h: 38 },
  { i: "SV", team: "b", h: 94 },
  { i: "DT", team: "c", h: 63 },
  { i: "MA", team: "a", h: 46 },
];

const toasts = ["Priya passed Caching", "12 candidates invited", "Backend team · 82% done"];

/** What the organization pages (/org/...) let a company do today: hire, then upskill. */
const ways = [
  {
    key: "hire",
    label: "Hire",
    title: "Find who can really do the job.",
    steps: [
      { icon: ClipboardCheck, title: "Pick a test", line: "Write one, or start from ours." },
      { icon: Send, title: "Invite candidates", line: "Paste a list, or a CSV." },
      { icon: Gavel, title: "Score and decide", line: "Proctored, then reviewed." },
    ],
  },
  {
    key: "grow",
    label: "Upskill",
    title: "Level up the team you have.",
    steps: [
      { icon: UserPlus, title: "Add people", line: "One by one, or a CSV." },
      { icon: UsersRound, title: "Make teams", line: "Pick a head for each." },
      { icon: LineChart, title: "Watch them climb", line: "Lessons and scores, live." },
    ],
  },
];

function Climb() {
  return (
    <figure className="org-climb relative" aria-label="Illustration: a team's progress bars rising as people learn">
      <div className="flex items-center justify-between text-xs font-semibold text-white/60">
        <span className="inline-flex items-center gap-2"><span className="org-live" aria-hidden="true" />Live progress</span>
        <span className="org-count display text-2xl text-white" aria-hidden="true" />
      </div>
      <div className="org-bars mt-4" aria-hidden="true">
        {climbers.map((c, n) => (
          <div key={c.i} className={`org-bar org-team-${c.team}`} style={{ "--h": `${c.h}%`, "--d": `${n * 0.18}s` } as React.CSSProperties}>
            <span className="org-avatar">{c.i}</span>
          </div>
        ))}
      </div>
      <div className="org-toasts" aria-hidden="true">
        {toasts.map((t, n) => (
          <p key={t} className="org-toast" style={{ "--t": `${n * 3}s` } as React.CSSProperties}>
            <span className="org-tick">✓</span>{t}
          </p>
        ))}
      </div>
    </figure>
  );
}

export default function OrganizationsPage() {
  return (
    <>
      <section className="org-hero relative isolate overflow-hidden bg-night text-white">
        <div aria-hidden="true" className="org-grid" />
        <div aria-hidden="true" className="org-glow" />
        <Container className="grid gap-10 pb-16 pt-10 sm:pt-16 lg:grid-cols-[1.15fr_1fr] lg:grid-rows-[auto_1fr] lg:gap-x-14 lg:pb-24">
          <div className="org-rise">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-white/70 ring-1 ring-white/12">
              For organizations
            </p>
            <h1 className="display mt-5 text-[clamp(2.6rem,7vw,5rem)] leading-[0.95]">
              Hire them.<br />
              <span className="org-shine">Level them up.</span>
            </h1>
          </div>

          <div className="org-rise lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center" style={{ "--rise": "0.12s" } as React.CSSProperties}>
            <div className="org-card relative rounded-slab bg-card p-6 text-ink shadow-float sm:p-8">
              <OrgEnquiryForm />
            </div>
            <p className="mt-4 text-center text-sm text-white/60">
              Already invited? <Link href="/org/sign-in" className="font-bold text-white underline underline-offset-4 hover:text-red-soft">Sign in</Link>
            </p>
          </div>

          <div className="org-rise lg:self-end" style={{ "--rise": "0.24s" } as React.CSSProperties}>
            <Climb />
          </div>
        </Container>
      </section>

      <Container className="py-16 sm:py-24">
        <h2 className="display text-center text-[clamp(2rem,5vw,3.25rem)]">Two ways to use Klymb.</h2>
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {ways.map((w) => (
            <section key={w.key} aria-labelledby={`way-${w.key}`} className={`org-way org-way-${w.key} rounded-slab p-6 sm:p-8`}>
              <p className="org-way-label">{w.label}</p>
              <h3 id={`way-${w.key}`} className="display mt-4 text-[clamp(1.6rem,3.4vw,2.25rem)]">{w.title}</h3>
              <ol className="mt-8 grid gap-3">
                {w.steps.map((s, n) => (
                  <li key={s.title} className="org-step group relative flex items-center gap-4 overflow-hidden rounded-card p-4">
                    <span aria-hidden="true" className="org-step-icon grid size-11 shrink-0 place-items-center rounded-xl">
                      <s.icon className="size-5 transition-transform duration-300 group-hover:scale-110" />
                    </span>
                    <div className="relative">
                      <h4 className="font-heading text-lg font-bold">{s.title}</h4>
                      <p className="text-sm opacity-70">{s.line}</p>
                    </div>
                    <span aria-hidden="true" className="org-step-num display">{n + 1}</span>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      </Container>
    </>
  );
}
