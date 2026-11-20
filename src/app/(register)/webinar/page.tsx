import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Plus, X } from "lucide-react";
import { CookieBanner } from "@/components/legal/CookieBanner";
import { Clipping } from "@/components/workshop/Clipping";
import { StickyBar, TopStrip, WorkshopProvider } from "@/components/workshop/WorkshopClock";
import { WorkshopRegister } from "@/components/workshop/WorkshopRegister";
import { site } from "@/data/config";
import {
  AUDIENCES, FAQ, HIRING_HEADLINES, HIRING_STATS, LAYOFF_HEADLINES, LAYOFF_STATS, NOT_FOR, SKILL_STATEMENT, type Stat,
} from "@/data/workshop";
import { WEBINAR, webinarClock } from "@/lib/webinar";

const title = "AI can write the code. Can you design the system? A free live webinar";
const description = `${WEBINAR.title}: ${WEBINAR.dateLabel}, ${WEBINAR.timeLabel}. See the one skill AI can't do for you done live, in one hour. Free, online.`;

export const metadata: Metadata = {
  title, description,
  alternates: { canonical: "/webinar" },
  openGraph: { title, description },
  twitter: { title, description },
};

/** Read at request time, so the countdown and "registration closed" follow the real clock. */
export const dynamic = "force-dynamic";

const FACTS = [
  ["Date", "Sat, 21 Nov 2026"],
  ["Time", "7:00–8:00 PM IST"],
  ["Where", "Online, live"],
  ["Fee", "Free"],
] as const;

const NAV = [["#news", "The news"], ["#for-you", "Is it for you?"], ["#faq", "FAQ"]] as const;

const eyebrow = "text-[13px] font-semibold uppercase tracking-[0.14em]";
const h2 = "display text-[clamp(2rem,4.4vw,3.75rem)] leading-none tracking-[-0.04em]";
const section = "scroll-mt-24 border-t-2 border-line/30 py-[clamp(3rem,8vh,6rem)]";

/**
 * The long, public page for the free System Design webinar (the design from
 * Claude Design, "Klymb Workshop v2"). The sign-up is the same one as on
 * the plain sign-up page at /workshop: same endpoint, same list of registrations.
 */
export default function WebinarPage() {
  const { now } = webinarClock();
  return (
    <WorkshopProvider serverNow={now}>
      <div className="overflow-x-clip bg-paper pb-28 text-ink">
        <TopStrip />

        <div className="sticky top-0 z-30 px-3 pt-3 sm:px-8">
          <nav aria-label="Page" className="mx-auto flex max-w-[1280px] items-center gap-2 rounded-2xl border border-line/30 bg-paper/80 py-2 pl-5 pr-2 shadow-card backdrop-blur-md sm:rounded-full">
            <Link href="/" className="display flex-none text-[22px] text-ink no-underline">Klymb<span className="text-red-strong">.</span></Link>
            <div className="hidden flex-1 justify-end gap-0.5 md:flex">
              {NAV.map(([href, label]) => (
                <a key={href} href={href} className="rounded-full px-3.5 py-2 text-[15px] text-ink no-underline transition-colors hover:bg-red-tint hover:text-red-strong">{label}</a>
              ))}
            </div>
            <span className="flex-1 md:hidden" />
            <a href="#register" className="inline-flex flex-none items-center gap-2 rounded-full bg-red-strong px-[18px] py-2.5 text-[15px] font-bold text-white no-underline transition-[background-color,transform] duration-150 hover:bg-red-press active:scale-[0.98]">
              Register free <ArrowRight size={16} aria-hidden="true" />
            </a>
          </nav>
        </div>

        <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-12">
          {/* Hero and the ticket. */}
          <section className="grid items-start gap-x-[clamp(2rem,5vw,5rem)] gap-y-12 py-[clamp(2rem,6vh,4.5rem)] lg:grid-cols-2">
            <div className="flex flex-col items-start gap-7">
              <span className="rounded-full bg-red-tint px-3.5 py-1.5 text-[13px] font-semibold uppercase tracking-[0.08em] text-red-strong">Free · Live · 60 minutes</span>
              <h1 className="text-[clamp(2.5rem,6vw,5.25rem)] font-extrabold leading-[0.98] tracking-[-0.045em]">
                AI can write the code.
                <span className="block italic text-red-strong">Can you design the system?</span>
              </h1>
              <p className="max-w-[560px] text-[clamp(1.0625rem,1.5vw,1.25rem)] leading-normal text-ink/80">The one skill AI can&apos;t do for you. See it done live, in one hour.</p>
              <dl className="grid w-full grid-cols-2 border-y-2 border-line/30 sm:grid-cols-4">
                {FACTS.map(([k, v]) => (
                  <div key={k} className="grid gap-1 py-4 pr-4">
                    <dt className="text-xs uppercase tracking-[0.12em] text-ink/65">{k}</dt>
                    <dd className={`display display-soft text-lg ${k === "Fee" ? "text-red-strong" : ""}`}>{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <WorkshopRegister />
          </section>

          {/* 01: the layoffs. */}
          <section id="news" className={`${section} grid gap-10`}>
            <div className="grid max-w-[820px] gap-3.5">
              <span className={`${eyebrow} text-red-strong`}>01 · You&apos;ve seen the headlines</span>
              <h2 className={h2}>Every week, another company cuts jobs and names AI.</h2>
            </div>
            <div className="grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {LAYOFF_HEADLINES.map((h, i) => <Clipping key={h.href} item={h} index={i} />)}
            </div>
            <StatRow stats={LAYOFF_STATS} />
          </section>

          {/* 02: the other half. */}
          <section className="grid gap-10 rounded-card bg-ink p-[clamp(2rem,5vw,4rem)] text-paper">
            <div className="grid max-w-[820px] gap-3.5">
              <span className={`${eyebrow} text-red-soft`}>02 · Now read the other half of the paper</span>
              <h2 className={h2}>The jobs aren&apos;t disappearing. They&apos;re moving to a different skill.</h2>
            </div>
            <div className="grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {HIRING_HEADLINES.map((h, i) => <Clipping key={h.href} item={h} index={i + 1} />)}
            </div>
            <StatRow stats={HIRING_STATS} onDark />
            <p className="display display-soft max-w-[900px] text-[clamp(1.25rem,2.2vw,1.875rem)] leading-tight tracking-[-0.02em]">{SKILL_STATEMENT}</p>
          </section>

          {/* 03: who it's for. */}
          <section id="for-you" className={`${section} grid gap-9`}>
            <div className="grid max-w-[820px] gap-3.5">
              <span className={`${eyebrow} text-red-strong`}>03 · Is this webinar for you?</span>
              <h2 className={h2}>If you nod at any of these, save a seat.</h2>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {AUDIENCES.map(([who, why]) => (
                <li key={who} className="grid grid-cols-[auto_1fr] items-start gap-4 rounded-card border border-line/30 p-6">
                  <span className="grid size-[30px] place-items-center rounded-full bg-red-strong text-white"><Check size={15} strokeWidth={3} aria-hidden="true" /></span>
                  <span className="grid gap-1.5">
                    <strong className="display display-soft text-xl leading-tight">{who}</strong>
                    <span className="text-[15px] leading-normal text-ink/80">{why}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="grid grid-cols-[auto_1fr] items-start gap-4 border-y-2 border-line/30 py-5">
              <span className="grid size-[30px] place-items-center rounded-full border-2 border-ink"><X size={14} strokeWidth={3} aria-hidden="true" /></span>
              <span className="grid gap-1">
                <strong className="display display-soft text-xl leading-tight">Probably not for you if</strong>
                <span className="text-[15px] leading-normal text-ink/80">{NOT_FOR}</span>
              </span>
            </div>
          </section>

          {/* 04: questions. */}
          <section id="faq" className={`${section} grid items-start gap-x-[clamp(2rem,5vw,5rem)] gap-y-9 lg:grid-cols-2`}>
            <div className="grid gap-3.5">
              <span className={`${eyebrow} text-red-strong`}>04 · Questions</span>
              <h2 className={h2}>Before you register</h2>
            </div>
            <div className="border-t-2 border-ink">
              {FAQ.map(([q, a]) => (
                <details key={q} className="group border-b border-line/30">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[19px] font-bold marker:hidden [&::-webkit-details-marker]:hidden" style={{ fontFamily: "var(--font-heading)" }}>
                    {q}
                    <Plus size={26} aria-hidden="true" className="flex-none text-red-strong transition-transform duration-200 group-open:rotate-45" />
                  </summary>
                  <p className="pb-5 text-base leading-relaxed text-ink/85">{a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* The close. */}
          <section className="grid justify-items-start gap-7 rounded-card bg-red-strong p-[clamp(2.25rem,6vw,5rem)] text-white">
            <h2 className="display text-[clamp(2.5rem,7vw,6.5rem)] leading-[0.95] tracking-[-0.05em]">
              AI writes the code.
              <span className="block">You design the system.</span>
            </h2>
            <p className="text-[clamp(1.0625rem,1.6vw,1.25rem)]">Sat, 21 Nov 2026 · 7:00 to 8:00 PM IST · Online · Free</p>
            <a href="#register" className="flex min-w-[260px] items-center justify-between gap-4 rounded-xl bg-white px-[22px] py-[18px] text-lg font-bold text-ink no-underline transition-colors duration-150 hover:bg-ink hover:text-white">
              Save my free seat <ArrowRight size={20} aria-hidden="true" />
            </a>
          </section>

          <footer className="grid gap-2.5 pt-8 text-[13px] text-ink/70">
            <p>Headlines link to their original sources. Figures are as reported by each publication; projections are not guarantees.</p>
            <p className="flex flex-wrap justify-between gap-3">
              <span>klymb.ai · System Design in 21 days, 15 minutes a day</span>
              <span>© 2026 Klymb.ai · <Link href="/privacy" className="underline underline-offset-2">Privacy</Link> · <Link href="/terms" className="underline underline-offset-2">Terms</Link></span>
            </p>
          </footer>
        </div>

        <StickyBar />
      </div>
      <CookieBanner />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd()).replace(/</g, "\\u003c") }} />
    </WorkshopProvider>
  );
}

/** A row of big figures, each with what it counts and where it came from. */
function StatRow({ stats, onDark }: { stats: Stat[]; onDark?: boolean }) {
  return (
    <ul className={`grid sm:grid-cols-3 ${onDark ? "border-t-2 border-paper/25" : "border-y-2 border-ink"}`}>
      {stats.map((s) => (
        <li key={s.value} className={`grid content-start gap-1.5 pr-5 ${onDark ? "pt-5" : "py-6"}`}>
          <strong className={`display text-[clamp(2.75rem,4.6vw,4rem)] leading-none tracking-[-0.04em] ${s.faded ? "opacity-55" : s.accent ? "text-red-soft" : ""}`}>{s.value}</strong>
          <span className={onDark ? "text-[15px]" : "font-semibold"}>{s.label}</span>
          {s.source && <span className="text-[13px] opacity-65">{s.source}</span>}
        </li>
      ))}
    </ul>
  );
}

/** The webinar as structured data, for search engines. */
function eventJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: `${WEBINAR.title}: a free live webinar`,
    description,
    startDate: WEBINAR.startsAt,
    endDate: WEBINAR.endsAt,
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: { "@type": "VirtualLocation", url: `${site.url}/webinar` },
    organizer: { "@type": "Organization", name: "Klymb.ai", url: site.url },
    offers: { "@type": "Offer", price: 0, priceCurrency: "INR", url: `${site.url}/webinar`, availability: "https://schema.org/InStock" },
  };
}
