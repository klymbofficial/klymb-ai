import { cohort, pricing } from "@/data/config";
import { valueBreakdown } from "@/data/program";
import { priceFrom, tracksByPrice } from "@/data/tracks";
import type { Track } from "@/types/program";
import Link from "next/link";
import { formatDate, formatINR } from "@/lib/format";
import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Appear } from "@/components/motion/Appear";
import { PriceDrop } from "@/components/motion/PriceDrop";

function Fact({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div>
      <dt className="text-xs font-extrabold uppercase tracking-[0.12em] text-white/60">{label}</dt>
      <dd className="mt-1 text-base font-extrabold">{value}</dd>
      {note && <p className="mt-0.5 text-xs text-white/60">{note}</p>}
    </div>
  );
}

/** The promise that decides the price, said the same way everywhere it appears. */
function RefundPromise({ onRed }: { onRed?: boolean }) {
  return (
    <div className={`flex gap-3 rounded-card p-4 ${onRed ? "bg-white/12" : "bg-red-tint"}`}>
      <svg className={`mt-0.5 size-5 shrink-0 ${onRed ? "text-white" : "text-red-strong"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
        <path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3Z" /><path d="m8.5 12 2.5 2.5 4.5-5" />
      </svg>
      <p className={`text-sm leading-relaxed ${onRed ? "text-white" : "text-ink"}`}>
        <strong className="font-extrabold">Complete all 30 days and get 100% of your fee back.</strong>{" "}
        <Link href="/refund-policy" className={`underline underline-offset-2 ${onRed ? "text-white/85 hover:text-white" : "text-muted hover:text-ink"}`}>
          How the refund works
        </Link>
      </p>
    </div>
  );
}

/**
 * The pricing pair. On the landing page it lists every track's price; on a
 * track's page, pass `track` to show that track's price and call to action.
 */
export function Pricing({ track }: { track?: Track } = {}) {
  const ctaHref = track ? `/register?track=${track.slug}` : "#register";
  const ctaLabel = track ? `Choose ${track.name}` : "Start learning today";
  const subtitle = track
    ? `${track.name} track. Everything below is included.`
    : "One career track. Everything below is included, whichever you choose.";
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
          <div className="mt-8"><RefundPromise /></div>
        </div>

        <div className="bg-red-strong p-8 text-white sm:p-12">
          {track ? (
            <>
              {/* The price falls from the reference value, but only while that
                  value is shown: it must be a genuine, documented figure. */}
              {pricing.showReferenceValue ? (
                <PriceDrop
                  from={pricing.referenceValue}
                  to={track.price}
                  label={`Launch price · ${track.name}`}
                  className="display text-[clamp(2.75rem,6vw,4rem)] nums"
                />
              ) : (
                <>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/70">Launch price · {track.name}</p>
                  <p className="display mt-1 text-[clamp(2.75rem,6vw,4rem)] nums">{formatINR(track.price)}</p>
                </>
              )}
            </>
          ) : (
            <>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-white/70">Launch price by track</p>
              <p className="display mt-1 text-[clamp(2.25rem,5vw,3.25rem)] nums">From {formatINR(priceFrom)}</p>
              <ul className="mt-5 divide-y divide-white/20 border-y border-white/20">
                {tracksByPrice.map((t) => (
                  <li key={t.slug}>
                    <Link href={`/tracks/${t.slug}`} className="flex items-baseline justify-between gap-4 py-3 transition-colors hover:text-white/80">
                      <span className="text-[15px] font-semibold">{t.name}</span>
                      <span className="display text-xl nums">{formatINR(t.price)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="mt-5 border-t border-white/25 pt-5 text-xs text-white/80">{pricing.taxNote}</p>

          <dl className="mt-6 grid grid-cols-2 gap-6 border-t border-white/25 pt-6 sm:grid-cols-3">
            <Fact label="Cohort starts" value={formatDate(cohort.startDate)} />
            <Fact
              label="Enrollment closes"
              value={formatDate(cohort.enrollmentDeadline)}
              note={cohort.enrollmentDeadlineIsPlaceholder ? "Placeholder: to be confirmed" : undefined}
            />
            <Fact
              label="Seats per track"
              value={String(cohort.cohortCapacity)}
              note={cohort.cohortCapacityIsPlaceholder ? "Placeholder: to be confirmed" : undefined}
            />
          </dl>

          <p className="mt-6 border-t border-white/25 pt-6 text-xs leading-relaxed text-white/80">{cohort.capacityReason}</p>
          <ButtonLink href={ctaHref} variant="inverse" soft arrow className="mt-7">{ctaLabel}</ButtonLink>
        </div>
      </Appear>
    </section>
  );
}
