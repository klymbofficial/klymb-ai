"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, BadgeIndianRupee, BriefcaseBusiness, CalendarDays, Check, FolderGit2, MessagesSquare, ShieldCheck, Target } from "lucide-react";
import { cohort } from "@/data/config";
import { getTrack, priceFrom } from "@/data/tracks";
import { formatDate, formatINR } from "@/lib/format";
import type { TrackSlug } from "@/types/program";
import { Appear } from "@/components/motion/Appear";
import { Wordmark } from "@/components/layout/Wordmark";
import { RegistrationForm, type GoogleUser } from "./RegistrationForm";

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
    <section id="register" aria-labelledby="register-title" className="grid lg:h-dvh lg:grid-cols-2">
      {/* ── The value: what they get, what it costs, and that it comes back ── */}
      <div className="relative flex flex-col gap-6 overflow-hidden bg-red-muted p-6 text-white sm:p-10 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:py-8">
        {/* A soft glow so the panel has depth without competing with the type. */}
        <div aria-hidden="true" className="pointer-events-none absolute -top-40 -right-40 size-[28rem] rounded-full bg-red-soft/20 blur-3xl" />

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
            Starts {formatDate(cohort.startDate)}
          </span>
        </div>

        <Appear className="relative">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-white/60">
            {track ? `${track.name} cohort` : "30-day cohort"}
          </p>
          <h1 id="register-title" className="display display-soft mt-3 max-w-2xl text-[clamp(1.9rem,2.9vw,3rem)] text-white">
            {track ? <>From {track.name} to <span className="text-red-soft">{track.becomes}</span>, in 30 days.</> : "30 days. Real work. A portfolio that gets you hired."}
          </h1>
        </Appear>

        {/* The offer: price and the refund, side by side, so the refund is read as part of the price. */}
        <Appear delay={0.1} className="relative grid gap-px overflow-hidden rounded-card bg-white/15 ring-1 ring-white/15 sm:grid-cols-2">
          <div className="bg-red-muted-deep/80 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-white/60">{track ? "Your fee" : "Fees from"}</p>
            <p className="display mt-1 text-4xl text-white tabular-nums">{formatINR(price)}</p>
            <p className="mt-1 text-xs text-white/60">One payment. UPI, cards or net banking.</p>
          </div>
          <div className="bg-white p-5 text-ink">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-red-deep">
              <BadgeIndianRupee aria-hidden="true" className="size-4" /> 100% back
            </p>
            <p className="display mt-1 text-4xl tabular-nums">₹0</p>
            <p className="mt-1 text-xs text-ink/70">
              if you finish all 30 days. <Link href="/refund-policy" className="font-semibold underline underline-offset-2">How it works</Link>
            </p>
          </div>
        </Appear>

        <Appear delay={0.2} className="relative hidden sm:block">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-white/60">What you get</p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {INCLUDED.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3 rounded-xl bg-white/[0.07] p-3.5 ring-1 ring-white/10">
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
              {track.outcomes.slice(0, 4).map((o) => (
                <li key={o} className="flex items-start gap-2.5 text-sm text-white/85">
                  <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-red-soft" />
                  {o}
                </li>
              ))}
            </ul>
          </Appear>
        )}

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
