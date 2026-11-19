import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, IndianRupee, Laptop, Timer } from "lucide-react";
import presenting from "@/assets/track-page/presenting.jpg";
import { CookieBanner } from "@/components/legal/CookieBanner";
import { InternshipForm } from "@/components/internship/InternshipForm";
import { INTERNSHIP } from "@/lib/internship";

const title = "Growth & Community Intern at Klymb.ai";
const description = `Build connections. Help others upskill. Grow with Klymb.ai. A remote, ${INTERNSHIP.months}-month internship from ${INTERNSHIP.startsLabel}: earn ${INTERNSHIP.commissionPct}% on every paid enrollment through your personal link.`;

export const metadata: Metadata = {
  title, description,
  alternates: { canonical: "/internship" },
  openGraph: { title, description },
  twitter: { title, description },
};

const FACTS = [
  { Icon: Laptop, text: "Remote" },
  { Icon: Timer, text: `${INTERNSHIP.months} months` },
  { Icon: IndianRupee, text: "Performance-based earnings" },
  { Icon: CalendarDays, text: `Starts ${INTERNSHIP.startsLabel}` },
] as const;

const STEPS: [string, string][] = [
  ["Apply", "Two minutes. Tell us who you are and why you'd be good at this."],
  ["A short call", "We call the people we shortlist for a quick chat, usually within a few days."],
  ["Your own link", "Once you're in, you get a personal link for our courses. Every purchase through it is counted as yours, and you can see your sales as they happen."],
  [`Earn ${INTERNSHIP.commissionPct}% on every paid enrollment`, `${INTERNSHIP.commissionPct}% of what each buyer actually pays, added up and paid to you after the end of each month. A buyer's refund doesn't reduce what you've earned.`],
];

/** The internship, laid out like /webinar: what it is on the left, the application beside it (under it on a phone). */
export default function InternshipPage() {
  return (
    <>
      <div className="grid min-h-dvh grid-cols-[minmax(0,1fr)] lg:grid-cols-[1fr_1fr]">
        <section className="relative isolate overflow-hidden bg-red-muted px-5 pb-14 pt-6 text-white sm:px-10 lg:px-14 lg:pb-14 lg:pt-12">
          <Image src={presenting} alt="" aria-hidden="true" fill priority placeholder="blur" sizes="(min-width: 1024px) 50vw, 100vw" className="pointer-events-none -z-20 object-cover" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-red-muted/85 via-red-muted/92 to-red-muted-deep/97" />
          <div className="mx-auto w-full max-w-xl">
            <Link href="/" className="display text-lg text-white no-underline">KLYMB<span className="text-red-soft">.AI</span></Link>
            <p className="mt-8 text-xs font-extrabold uppercase tracking-[0.16em] text-white/60 lg:mt-12">Growth &amp; Community Intern</p>
            <h1 className="display display-soft mt-2 text-[clamp(1.9rem,6vw,3rem)] leading-[1.05]">
              Build connections. Help others upskill. <span className="text-red-soft">Grow with Klymb.ai</span>
            </h1>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-white/80">
              Connect learners with relevant courses, grow your network, and gain practical experience in outreach and business development. Earn {INTERNSHIP.commissionPct}% on every paid enrollment through your personal link.
            </p>
            <ul className="mt-5 flex flex-wrap gap-2" aria-label="The role at a glance">
              {FACTS.map(({ Icon, text }) => (
                <li key={text} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/15">
                  <Icon size={14} aria-hidden="true" className="text-red-soft" />{text}
                </li>
              ))}
            </ul>
            <a href="#apply" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-base font-bold text-red-strong no-underline transition-transform duration-150 active:scale-[0.98] lg:hidden">
              Apply now <span aria-hidden="true">↓</span>
            </a>

            <h2 className="mt-9 text-xs font-extrabold uppercase tracking-[0.16em] text-white/60">How it works</h2>
            <ol className="mt-3 flex flex-col">
              {STEPS.map(([head, body], i) => (
                <li key={head} className="flex gap-4 border-t border-white/15 py-3.5 last:border-b">
                  <span aria-hidden="true" className="display w-6 flex-none text-sm leading-6 text-red-soft">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <p className="text-[15px] font-bold leading-6">{head}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-white/70">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-5 text-sm leading-relaxed text-white/70">
              This is a commission-based opportunity with no fixed stipend.
            </p>
          </div>
        </section>

        <section id="apply" className="relative -mt-8 scroll-mt-4 rounded-t-3xl bg-card px-5 pb-10 pt-7 sm:px-10 lg:mt-0 lg:rounded-none lg:px-16 lg:py-14">
          <div className="mx-auto w-full max-w-lg">
            <InternshipForm />
            <p className="mt-6 text-xs leading-relaxed text-muted">
              We only use your details to review your application and contact you about it ·{" "}
              <Link href="/privacy" className="underline underline-offset-2">Privacy</Link>
            </p>
          </div>
        </section>
      </div>
      <CookieBanner />
    </>
  );
}
