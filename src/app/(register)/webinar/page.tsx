import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Clock, Video } from "lucide-react";
import presenting from "@/assets/track-page/presenting.jpg";
import { CookieBanner } from "@/components/legal/CookieBanner";
import { WebinarForm } from "@/components/webinar/WebinarForm";
import { site } from "@/data/config";
import { WEBINAR, webinarClock } from "@/lib/webinar";

const title = `Free live webinar: ${WEBINAR.title}`;
const description = `${WEBINAR.dateLabel}, ${WEBINAR.timeLabel}. Getting job-ready in the AI era, Klymb.ai's courses, why we started Klymb.ai, live Q&A and what's coming next. Free.`;

export const metadata: Metadata = {
  title, description,
  alternates: { canonical: "/webinar" },
  openGraph: { title, description },
  twitter: { title, description },
};

/** Read at request time, so "registration closed" follows the real clock. */
export const dynamic = "force-dynamic";

const FACTS = [
  { Icon: CalendarDays, text: WEBINAR.dateLabel },
  { Icon: Clock, text: WEBINAR.timeLabel },
  { Icon: Video, text: "Live on Google Meet" },
] as const;

/**
 * The free webinar, laid out like /join: a maroon panel with what it covers,
 * and the sign-up beside it (under it on a phone).
 */
export default function WebinarPage() {
  const { open } = webinarClock();
  return (
    <>
      <div className="grid min-h-dvh grid-cols-[minmax(0,1fr)] lg:grid-cols-[1fr_1fr]">
        <section className="relative isolate overflow-hidden bg-red-muted px-5 pb-14 pt-6 text-white sm:px-10 lg:flex lg:flex-col lg:justify-center lg:px-14 lg:py-12">
          <Image src={presenting} alt="" aria-hidden="true" fill priority placeholder="blur" sizes="(min-width: 1024px) 50vw, 100vw" className="pointer-events-none -z-20 object-cover" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-red-muted/85 via-red-muted/92 to-red-muted-deep/97" />
          <div className="mx-auto w-full max-w-xl">
            <Link href="/" className="display text-lg text-white no-underline">KLYMB<span className="text-red-soft">.AI</span></Link>
            <p className="mt-8 text-xs font-extrabold uppercase tracking-[0.16em] text-white/60 lg:mt-12">Free live webinar · 1 hour</p>
            <h1 className="display display-soft mt-2 text-[clamp(1.9rem,6vw,3rem)] leading-[1.05]">
              {WEBINAR.title}: <span className="text-red-soft">getting job-ready in the AI era.</span>
            </h1>
            <ul className="mt-5 flex flex-wrap gap-2" aria-label="When and where">
              {FACTS.map(({ Icon, text }) => (
                <li key={text} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/15">
                  <Icon size={14} aria-hidden="true" className="text-red-soft" />{text}
                </li>
              ))}
            </ul>
            <a href="#register" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-base font-bold text-red-strong no-underline transition-transform duration-150 active:scale-[0.98] lg:hidden">
              Save my seat <span aria-hidden="true">↓</span>
            </a>

            <h2 className="mt-9 text-xs font-extrabold uppercase tracking-[0.16em] text-white/60">What we&apos;ll cover</h2>
            <ol className="mt-3 flex flex-col">
              {WEBINAR.agenda.map(([head, body], i) => (
                <li key={head} className="flex gap-4 border-t border-white/15 py-3.5 last:border-b">
                  <span aria-hidden="true" className="display w-6 flex-none text-sm leading-6 text-red-soft">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <p className="text-[15px] font-bold leading-6">{head}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-white/70">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-5 text-sm text-white/70">Hosted by the {WEBINAR.speaker}. For students and working professionals.</p>
          </div>
        </section>

        <section id="register" className="relative -mt-8 scroll-mt-4 rounded-t-3xl bg-card px-5 pb-10 pt-7 sm:px-10 lg:sticky lg:top-0 lg:mt-0 lg:flex lg:max-h-dvh lg:min-h-dvh lg:items-center lg:self-start lg:overflow-y-auto lg:rounded-none lg:px-16 lg:py-10">
          <div className="mx-auto w-full max-w-lg">
            <WebinarForm open={open} />
            <p className="mt-6 text-xs leading-relaxed text-muted">
              We only use your details to message you about this webinar and Klymb.ai&apos;s courses ·{" "}
              <Link href="/privacy" className="underline underline-offset-2">Privacy</Link>
            </p>
          </div>
        </section>
      </div>
      <CookieBanner />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd()).replace(/</g, "\\u003c") }} />
    </>
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
