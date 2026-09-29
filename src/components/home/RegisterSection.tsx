import Link from "next/link";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { cohort } from "@/data/config";
import { urgency } from "@/data/program";
import { formatDate } from "@/lib/format";
import type { TrackSlug } from "@/types/program";
import { Appear } from "@/components/motion/Appear";
import { Wordmark } from "@/components/layout/Wordmark";
import { ClimbIllustration } from "./ClimbIllustration";
import { RegistrationForm, type GoogleUser } from "./RegistrationForm";

export function RegisterSection({ defaultTrack, googleUser }: { defaultTrack?: TrackSlug; googleUser?: GoogleUser }) {
  return (
    <section id="register" aria-labelledby="register-title" className="grid lg:h-dvh lg:grid-cols-2">
        {/* ── The panel: one photograph, the promise, and the 30 days at a glance ── */}
        <div className="relative flex flex-col gap-6 overflow-hidden bg-red-muted p-6 text-white sm:p-10 lg:h-full lg:min-h-0 lg:gap-6 lg:py-8">
          <Link
            href="/"
            className="group inline-flex items-center gap-1.5 self-start rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white ring-1 ring-white/20 backdrop-blur-sm transition-colors duration-200 hover:bg-white/20"
          >
            <ArrowLeft aria-hidden="true" className="size-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
            Back to home
          </Link>

          {/* Type leads: the headline and one line under it. */}
          <div>
            <Appear>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-white/60">Registration</p>
              <h1 id="register-title" className="display display-soft mt-3 max-w-2xl text-[clamp(1.9rem,2.9vw,3rem)] text-white">
                {urgency.headline}
              </h1>
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/75">{urgency.support}</p>
            </Appear>

          </div>

          {/* The illustration takes whatever height the type leaves, so the
              panel always fits the screen. */}
          <Appear delay={0.3} y={12} className="relative flex min-h-64 flex-1 items-center justify-center overflow-hidden rounded-card bg-[#f7efe3] p-4 lg:min-h-40">
            <ClimbIllustration className="h-full max-h-full w-auto max-w-full" />
            <span className="absolute top-3.5 left-3.5 inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-ink shadow-card">
              <CalendarDays aria-hidden="true" className="size-3.5 text-red-deep" />
              Next cohort starts {formatDate(cohort.startDate)}
            </span>
          </Appear>
        </div>

        {/* ── The form ──────────────────────────────────────────── */}
        <div className="flex flex-col px-5 py-8 sm:px-10 lg:h-full lg:overflow-y-auto lg:px-16 lg:py-8">
          <Wordmark className="self-start text-lg" />
          <div className="my-auto w-full max-w-2xl pt-8 lg:pt-6">
            <RegistrationForm defaultTrack={defaultTrack} googleUser={googleUser} bare titled />
          </div>
        </div>
    </section>
  );
}
