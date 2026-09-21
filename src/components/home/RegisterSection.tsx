import Image from "next/image";
import type { StaticImageData } from "next/image";
import { cohort } from "@/data/config";
import { urgency } from "@/data/program";
import { formatDate } from "@/lib/format";
import type { TrackSlug } from "@/types/program";
import { RegistrationForm } from "./RegistrationForm";
import avatarAmber from "@/assets/avatar-amber.jpg";
import avatarMaroon from "@/assets/avatar-maroon.jpg";
import avatarSlate from "@/assets/avatar-slate.jpg";

/**
 * A concentric-ring motif: rows of rings stacked into a triangle, growing
 * away from the corner it sits in.
 */
function RingCluster({ rows, align }: { rows: number[]; align: "left" | "right" }) {
  return (
    <div aria-hidden="true" className={`flex flex-col gap-2 sm:gap-3 ${align === "right" ? "items-end" : "items-start"}`}>
      {rows.map((count, row) => (
        <div key={row} className="flex gap-2 sm:gap-3">
          {Array.from({ length: count }, (_, i) => (
            <span key={i} className="grid size-5 place-items-center rounded-full border-2 border-white/45 sm:size-8 sm:border-[3px]">
              <span className="size-1.5 rounded-full bg-white/45 sm:size-2.5" />
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

/** The circular portraits floating over the panel. */
function Portrait({
  src, alt, className, position,
}: { src: StaticImageData; alt: string; className: string; position: string }) {
  return (
    <div
      className={`absolute aspect-square w-[12%] min-w-[4.5rem] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full ring-4 ring-white/15 ${className}`}
    >
      <Image src={src} alt={alt} sizes="120px" style={{ objectPosition: position }} className="size-full object-cover" />
    </div>
  );
}

export function RegisterSection({ defaultTrack }: { defaultTrack?: TrackSlug }) {
  return (
    <section id="register" aria-labelledby="register-title" className="mx-auto max-w-[96rem] px-4 py-8 sm:px-6">
      <div className="card grid gap-8 rounded-slab p-4 shadow-float sm:p-6 lg:grid-cols-[1.35fr_1fr] lg:gap-10 lg:p-8">
        {/* ── The panel ─────────────────────────────────────────── */}
        <div className="relative flex min-h-[26rem] flex-col justify-end overflow-hidden rounded-card bg-[#d86251] p-7 sm:p-10 lg:min-h-[41rem]">
          <div className="absolute top-6 left-6 sm:top-9 sm:left-9">
            <RingCluster rows={[4, 3, 2, 1]} align="left" />
          </div>
          <div className="absolute right-6 bottom-6 hidden sm:right-9 sm:bottom-9 sm:block">
            <RingCluster rows={[1, 2, 3, 4]} align="right" />
          </div>

          {/* The arch and the portraits are the composition's centrepiece; on a
              narrow screen they would sit on top of the headline, so they go. */}
          <div aria-hidden="true" className="absolute top-[10%] left-[35%] hidden aspect-[380/426] w-[35%] rounded-t-full bg-[#a73323] sm:block" />
          <div className="absolute inset-0 hidden sm:block">
            <Portrait
              src={avatarAmber}
              alt="A Klymb.ai learner"
              position="50% 22%"
              className="top-[16%] left-[64%]"
            />
            <Portrait
              src={avatarSlate}
              alt="A Klymb.ai learner"
              position="50% 20%"
              className="top-[37%] left-[27%]"
            />
            <Portrait
              src={avatarMaroon}
              alt="A Klymb.ai learner"
              position="50% 22%"
              className="top-[59%] left-[80%]"
            />
          </div>

          <div className="relative max-w-xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-ink">Registration</p>
            <h1 id="register-title" className="display mt-4 text-[clamp(1.9rem,3.6vw,3rem)] text-white drop-shadow-sm">
              {urgency.headline}
            </h1>
            <p className="mt-5 text-sm leading-relaxed text-white/85 sm:text-base">
              The cohort starts on {formatDate(cohort.startDate)}. {cohort.capacityReason}
            </p>
          </div>
        </div>

        {/* ── The form ──────────────────────────────────────────── */}
        <div className="lg:py-4 lg:pr-4">
          <RegistrationForm defaultTrack={defaultTrack} bare />
        </div>
      </div>
    </section>
  );
}
