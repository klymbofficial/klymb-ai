import type { Metadata, Viewport } from "next";
import { CookieBanner } from "@/components/legal/CookieBanner";
import { WebinarView } from "@/components/webinar/WebinarView";
import { site } from "@/data/config";
import { WEBINAR, webinarClock } from "@/lib/webinar";

const title = `Free live webinar: ${WEBINAR.title}`;
const description = `${WEBINAR.dateLabel}, ${WEBINAR.timeLabel}. One hour on Claude, Claude Code and the AI tools worth using for study and work. Free.`;

export const metadata: Metadata = {
  title, description,
  alternates: { canonical: "/webinar" },
  openGraph: { title, description },
  twitter: { title, description },
};

export const viewport: Viewport = { themeColor: "#1a1716" };

/** Read at request time, so the countdown and "registration closed" follow the real clock. */
export const dynamic = "force-dynamic";

/** The free webinar: what it covers on the left, the sign-up on the right. */
export default function WebinarPage() {
  const { now, open } = webinarClock();
  return (
    <>
      <WebinarView open={open} serverNow={now} />
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
