import { cohort, pricing } from "@/data/config";
import { valueBreakdown } from "@/data/program";
import { formatDate, formatINR } from "@/lib/format";
import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Appear } from "@/components/motion/Appear";

function Fact({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div>
      <dt className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-white/60">{label}</dt>
      <dd className="mt-1 text-base font-extrabold">{value}</dd>
      {note && <p className="mt-0.5 text-[11px] text-white/60">{note}</p>}
    </div>
  );
}

/** The pricing pair. Track pages pass their own call to action and a subtitle naming the track. */
export function Pricing({
  ctaHref = "#register", ctaLabel = "Start learning today", subtitle = "One career track. Everything below is included.",
}: { ctaHref?: string; ctaLabel?: string; subtitle?: string } = {}) {
  return (
    <section id="pricing" aria-labelledby="pricing-title" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
      <Appear className="card grid overflow-hidden rounded-slab lg:grid-cols-2">
        <div className="p-8 sm:p-12">
          <Eyebrow>Pricing</Eyebrow>
          <h2 id="pricing-title" className="display mt-3 text-[clamp(1.75rem,3.4vw,2.5rem)] text-balance">{pricing.programName}</h2>
          <p className="mt-3 text-sm text-muted">{subtitle}</p>
          <ul className="mt-8 divide-y divide-line/25 border-t border-line/25">
            {valueBreakdown.map((item) => (
              <li key={item} className="flex items-center gap-3 py-3.5 text-[15px]">
                <svg className="size-4 shrink-0 text-red-strong" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                  <path d="m4 12 5 5L20 6" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-red-strong p-8 text-white sm:p-12">
          {pricing.showReferenceValue && (
            <p className="text-lg font-semibold text-white/85">
              Reference value <s className="font-extrabold">{formatINR(pricing.referenceValue)}</s>
            </p>
          )}
          <p className="mt-5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/70">Launch price</p>
          <p className="display mt-1 text-[clamp(2.75rem,6vw,4rem)] nums">{formatINR(pricing.launchPrice)}</p>
          <p className="mt-5 border-t border-white/25 pt-5 text-xs text-white/80">{pricing.taxNote}</p>

          <dl className="mt-6 grid grid-cols-2 gap-6 border-t border-white/25 pt-6 sm:grid-cols-3">
            <Fact label="Cohort starts" value={formatDate(cohort.startDate)} />
            <Fact
              label="Enrolment closes"
              value={formatDate(cohort.enrollmentDeadline)}
              note={cohort.enrollmentDeadlineIsPlaceholder ? "Placeholder — to be confirmed" : undefined}
            />
            <Fact
              label="Seats per track"
              value={String(cohort.cohortCapacity)}
              note={cohort.cohortCapacityIsPlaceholder ? "Placeholder — to be confirmed" : undefined}
            />
          </dl>

          <p className="mt-6 border-t border-white/25 pt-6 text-xs leading-relaxed text-white/80">{cohort.capacityReason}</p>
          <ButtonLink href={ctaHref} variant="inverse" soft arrow className="mt-7">{ctaLabel}</ButtonLink>
        </div>
      </Appear>
    </section>
  );
}
