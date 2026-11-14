import type { Metadata } from "next";
import Image from "next/image";
import codePhoto from "@/assets/tracks/junior-developer.jpg";
import { JoinForm } from "@/components/join/JoinForm";

/*
 * A link-only page: not in the menu or the sitemap, and search engines are
 * asked not to index it. Shared from Instagram stories, webinars and
 * hackathons as klymb.ai/join?from=ig, ?from=webinar-21nov and so on.
 */
export const metadata: Metadata = {
  title: "Get the System Design details",
  description: "Leave your details and we'll WhatsApp you everything about Klymb.ai's System Design course.",
  robots: { index: false, follow: false },
};

const topics = ["Load balancers", "Caching", "Databases", "Design WhatsApp", "Design Uber"];

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  return (
    <div className="grid min-h-dvh grid-cols-[minmax(0,1fr)] lg:grid-cols-[2fr_3fr]">
      <section className="relative isolate overflow-hidden bg-red-muted px-5 pb-14 pt-6 text-white sm:px-10 lg:flex lg:flex-col lg:justify-center lg:pb-10">
        {/* A code photo behind the panel, tinted brand maroon so the type stays readable, as on /register. */}
        <Image src={codePhoto} alt="" aria-hidden="true" fill priority placeholder="blur" sizes="(min-width: 1024px) 40vw, 100vw" className="pointer-events-none -z-20 object-cover" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-red-muted/80 via-red-muted/90 to-red-muted-deep/97" />
        <p className="display text-lg">KLYMB<span className="text-red-soft">.AI</span></p>
        <p className="mt-8 text-xs font-extrabold uppercase tracking-[0.16em] text-white/60 lg:mt-12">System Design</p>
        <h1 className="display display-soft mt-2 max-w-md text-[clamp(1.9rem,6vw,2.75rem)] leading-[1.05]">
          The interview round everyone fears. <span className="text-red-soft">Made simple.</span>
        </h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/75">
          Fill in your details and we&apos;ll share everything about the course with you.
        </p>
        <ul className="mt-5 flex max-w-md flex-wrap gap-2" aria-label="What the course covers">
          {topics.map((t) => (
            <li key={t} className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/15">{t}</li>
          ))}
        </ul>
      </section>

      <section className="relative -mt-8 rounded-t-3xl bg-card px-5 pb-10 pt-7 sm:px-10 lg:mt-0 lg:flex lg:items-center lg:rounded-none lg:px-16">
        <div className="mx-auto w-full max-w-lg">
          <JoinForm from={from ?? ""} />
        </div>
      </section>
    </div>
  );
}
