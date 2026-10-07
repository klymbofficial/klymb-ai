"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, BadgeIndianRupee, BriefcaseBusiness, CalendarDays, Check, FolderGit2, MessagesSquare, ShieldCheck, Target } from "lucide-react";
import { getTrack, priceFrom } from "@/data/tracks";
import { formatINR } from "@/lib/format";
import { trackImages } from "@/data/track-images";
import teamLaptop from "@/assets/track-page/team-laptop.jpg";
import type { TrackSlug } from "@/types/program";
import { Appear } from "@/components/motion/Appear";
import { Wordmark } from "@/components/layout/Wordmark";
import { RegistrationForm, type GoogleUser } from "./RegistrationForm";
import { ExpertsStrip } from "./ExpertsStrip";

/** What every track includes. Kept to what the course actually delivers. */
const INCLUDED = [
  { icon: Target, title: "30 real problems, one a day", body: "Work a team actually does, not videos to watch." },
  { icon: ShieldCheck, title: "4 graded checkpoints", body: "Scored against a rubric, with written feedback." },
  { icon: MessagesSquare, title: "2 mock interviews", body: "Practise the exact questions hiring panels ask." },
  { icon: FolderGit2, title: "A public portfolio on GitHub", body: "Evidence a recruiter can open, built day by day." },
];

export function RegisterSection({ defaultTrack, googleUser }: { defaultTrack?: TrackSlug; googleUser?: GoogleUser }) {
  const [slug, setSlug] = useState<TrackSlug | "">(defaultTrack ?? "");
  const track = slug ? getTrack(slug) : undefined;
  const price = track?.price ?? priceFrom;

  return (
    <section id="register" aria-labelledby="register-title" className="grid lg:h-dvh lg:grid-cols-[2fr_3fr]">
      {/* ── The value: what they get, what it costs, and that it comes back ── */}
      {/* Children never shrink: squeezed to the screen height, the cards clipped their own text. */}
      <div className="relative isolate flex flex-col gap-5 overflow-hidden bg-red-muted p-6 text-white sm:p-10 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:px-10 lg:py-8 [&>*]:shrink-0">
        {/* The track's photograph behind everything, tinted brand maroon so the type stays readable. */}
        <Image
          key={track?.slug ?? "default"}
          src={track ? trackImages[track.slug].src : teamLaptop}
          alt="" aria-hidden="true" fill priority placeholder="blur" sizes="(min-width: 1024px) 40vw, 100vw"
          className="pointer-events-none -z-20 animate-[fade-in_600ms_cubic-bezier(0.23,1,0.32,1)] object-cover"
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-red-muted/85 via-red-muted/92 to-red-muted-deep/97" />

        <div className="relative flex items-center justify-between gap-3">
          <Link
            href="/"
            className="group inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white ring-1 ring-white/20 transition-colors duration-200 hover:bg-white/20"
          >
            <ArrowLeft aria-hidden="true" className="size-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
            Back to home
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-ink">
            <CalendarDays aria-hidden="true" className="size-3.5 text-red-deep" />
            Start any day
          </span>
        </div>

        <Appear className="relative">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-white/60">
            {track ? `${track.name} cohort` : "30-day cohort"}
          </p>
          <h1 id="register-title" className="display display-soft mt-3 max-w-2xl text-[clamp(1.8rem,2.3vw,2.6rem)] text-white">
            {track ? <>From {track.name} to <span className="text-red-soft">{track.becomes}</span>, in 30 days.</> : "30 days. Real work. A portfolio that gets you hired."}
          </h1>
        </Appear>

        {/* The offer: price and the refund, side by side, so the refund is read as part of the price. */}
        <Appear delay={0.1} className="relative grid gap-px overflow-hidden rounded-card bg-white/15 ring-1 ring-white/15 sm:grid-cols-2">
          <div className="bg-red-muted-deep/90 p-4 sm:p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-white/60">{track ? "Your fee" : "Fees from"}</p>
            <p className="display mt-1 text-[clamp(1.6rem,2.4vw,2.25rem)] text-white tabular-nums">{formatINR(price)}</p>
            <p className="mt-1 text-xs text-white/60">One payment. UPI, cards or net banking.</p>
          </div>
          <div className="bg-white p-4 text-ink sm:p-5">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-red-deep">
              <BadgeIndianRupee aria-hidden="true" className="size-4" /> 100% back
            </p>
            <p className="display mt-1 text-[clamp(1.6rem,2.4vw,2.25rem)] tabular-nums">₹0</p>
            <p className="mt-1 text-xs text-ink/70">
              if you finish all 30 days. <Link href="/refund-policy" className="font-semibold underline underline-offset-2">How it works</Link>
            </p>
          </div>
        </Appear>

        <Appear delay={0.2} className="relative hidden sm:block">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-white/60">What you get</p>
          <ul className="mt-3 grid gap-2.5">
            {INCLUDED.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex items-center gap-3 rounded-xl bg-black/15 px-3.5 py-3 ring-1 ring-white/10 backdrop-blur-sm">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/10">
                  <Icon aria-hidden="true" className="size-4.5 text-red-soft" />
                </span>
                <span>
                  <span className="block text-sm font-bold text-white">{title}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-white/65">{body}</span>
                </span>
              </li>
            ))}
          </ul>
        </Appear>

        {track && (
          <Appear key={track.slug} delay={0.05} className="relative hidden sm:block">
            <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-white/60">
              <BriefcaseBusiness aria-hidden="true" className="size-3.5" /> You leave able to
            </p>
            <ul className="mt-3 space-y-2">
              {track.outcomes.slice(0, 3).map((o) => (
                <li key={o} className="flex items-start gap-2.5 text-sm text-white/85">
                  <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-red-soft" />
                  {o}
                </li>
              ))}
            </ul>
          </Appear>
        )}

        <ExpertsStrip tone="dark" className="relative" />

        <p className="relative mt-auto hidden items-center sm:flex gap-2 text-xs text-white/55">
          <ShieldCheck aria-hidden="true" className="size-4" />
          Payments secured by Razorpay. Your seat is confirmed the moment you pay.
        </p>
      </div>

      {/* ── The form ──────────────────────────────────────────── */}
      <div className="flex flex-col px-5 py-8 sm:px-10 lg:h-full lg:overflow-y-auto lg:px-16 lg:py-8">
        <Wordmark className="self-start text-lg" />
        <div className="my-auto w-full max-w-2xl pt-8 lg:pt-6">
          <RegistrationForm defaultTrack={defaultTrack} googleUser={googleUser} bare titled onTrackChange={setSlug} />
        </div>
      </div>
    </section>
  );
}
