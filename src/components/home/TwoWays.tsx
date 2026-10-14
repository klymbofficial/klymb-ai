import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Appear } from "@/components/motion/Appear";
import { LAUNCH_OFFER, offerOpen } from "@/lib/offer";
import { formatINR } from "@/lib/format";
import { APP_URL } from "@/data/products";
import { allFree } from "@/data/tracks";


/**
 * Klymb's two products side by side: the free platform (app.klymb.ai) to build in public and get discovered, and the 30-day course to get
 * job-ready. Gives a visitor who isn't ready to pay somewhere to go, and shows
 * free users the next step up.
 */
export function TwoWays() {
  const price = allFree ? "Free" : offerOpen() ? `${formatINR(LAUNCH_OFFER.price)} launch price` : "Priced per track";
  return (
    <section aria-labelledby="two-ways-title" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
      <Appear className="max-w-2xl">
        <Eyebrow>The Klymb family</Eyebrow>
        <h2 id="two-ways-title" className="display mt-3 text-[clamp(1.9rem,4vw,2.9rem)] text-balance">
          Two ways to climb. <span className="text-red-strong">Start free, or go all in.</span>
        </h2>
      </Appear>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        <Appear delay={0.05} className="flex">
          <article className="card flex flex-1 flex-col p-7 sm:p-9">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-muted">app.klymb.ai · free platform</p>
              <span className="rounded-full bg-[#dcfce7] px-3 py-1 text-xs font-bold text-[#166534]">Free</span>
            </div>
            <h3 className="display mt-4 text-3xl">Build in public. Get discovered.</h3>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              A free platform where you build real projects and companies see the work, not just your CV.
            </p>
            <ul className="mt-6 space-y-2.5 text-[15px]">
              {["Hackathons: weekend builds, judged and archived", "Challenges: scoped problems from real companies", "Cohorts: multi-week programs with mentors", "A recruiter network that hires on evidence"].map((t) => (
                <li key={t} className="flex gap-2.5"><Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-red-strong" />{t}</li>
              ))}
            </ul>
            <p className="mt-6 text-sm font-semibold text-ink">13,000+ people already on the platform</p>
            <a
              href={APP_URL}
              target="_blank"
              rel="noopener"
              className="mt-7 inline-flex items-center justify-center gap-2 self-start rounded-full border-2 border-ink px-6 py-3 text-sm font-bold text-ink transition-[background-color,color,transform] duration-150 hover:bg-ink hover:text-white active:scale-[0.97]"
            >
              Join free on app.klymb.ai <ArrowUpRight aria-hidden="true" className="size-4" />
            </a>
          </article>
        </Appear>

        <Appear delay={0.12} className="flex">
          <article className="flex flex-1 flex-col rounded-slab bg-red-strong p-7 text-white shadow-card sm:p-9">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-white/70">klymb.ai · the 30-day course</p>
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">{price}</span>
            </div>
            <h3 className="display mt-4 text-3xl">Get job-ready in 30 days.</h3>
            <p className="mt-3 text-[15px] leading-relaxed text-white/80">
              A structured course for one role, with a reviewer checking your work{allFree ? ", free for now." : " and a refund when you finish."}
            </p>
            <ul className="mt-6 space-y-2.5 text-[15px]">
              {["One real workplace problem a day", "4 graded checkpoints and 2 mock interviews", "A portfolio a recruiter can open", allFree ? "Free: all 30 days, no card needed" : "Day 1 free, 100% back when you complete"].map((t) => (
                <li key={t} className="flex gap-2.5"><Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-red-soft" />{t}</li>
              ))}
            </ul>
            <Link
              href="/tracks"
              className="mt-auto inline-flex items-center justify-center gap-2 self-start rounded-full bg-white px-6 py-3 text-sm font-bold text-ink transition-[background-color,transform] duration-150 hover:bg-paper active:scale-[0.97]"
            >
              Choose your track <span aria-hidden="true">→</span>
            </Link>
          </article>
        </Appear>
      </div>
    </section>
  );
}
