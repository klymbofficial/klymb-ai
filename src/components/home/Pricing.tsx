import { cohort, pricing } from "@/data/config";
import { valueBreakdown } from "@/data/program";
import { formatDate, formatINR } from "@/lib/format";
import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";

/*
 * ⚠️ Prices come from src/data/config.ts and MUST be verified before launch.
 * The reference value is only shown when `pricing.showReferenceValue` is true,
 * and must reflect a genuine value breakdown — not a fake anchor.
 */
export function Pricing() {
  return (
    <section id="pricing" aria-labelledby="pricing-title" className="border-b-2 border-line">
      <div className="mx-auto grid max-w-7xl lg:grid-cols-2">
        <div className="px-4 py-14 sm:px-6 sm:py-20">
          <Eyebrow>Pricing</Eyebrow>
          <h2 id="pricing-title" className="display mt-3 text-4xl sm:text-5xl">{pricing.programName}</h2>
          <p className="mt-4 text-lg text-muted">One career track. Everything below is included.</p>
          <ul className="mt-8 border-t-2 border-line">
            {valueBreakdown.map((item) => (
              <li key={item} className="flex items-center gap-3 border-b-2 border-line py-3.5 font-semibold">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" className="text-red-deep" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col justify-center gap-6 bg-red-strong px-4 py-14 text-white sm:px-6 sm:py-20">
          {pricing.showReferenceValue && (
            <p className="text-lg">
              Reference value <span className="font-bold line-through decoration-2">{formatINR(pricing.referenceValue)}</span>
            </p>
          )}
          <div>
            <Eyebrow tone="light">Launch price</Eyebrow>
            <p className="display mt-2 text-[clamp(3.5rem,9vw,6rem)]">{formatINR(pricing.launchPrice)}</p>
            <p className="mt-2 text-sm text-white/85">{pricing.taxNote}</p>
          </div>
          <dl className="grid gap-3 border-y-2 border-white/40 py-5 text-sm sm:grid-cols-3">
            <div><dt className="font-bold uppercase tracking-wider text-white/75">Cohort starts</dt><dd className="mt-1 text-base font-extrabold">{formatDate(cohort.startDate)}</dd></div>
            <div>
              <dt className="font-bold uppercase tracking-wider text-white/75">Enrolment closes</dt>
              <dd className="mt-1 text-base font-extrabold">{formatDate(cohort.enrollmentDeadline)}{cohort.enrollmentDeadlineIsPlaceholder && <span className="block text-xs font-semibold text-white/80">Placeholder — to be confirmed</span>}</dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-wider text-white/75">Seats per track</dt>
              <dd className="mt-1 text-base font-extrabold">{cohort.cohortCapacity}{cohort.cohortCapacityIsPlaceholder && <span className="block text-xs font-semibold text-white/80">Placeholder — to be confirmed</span>}</dd>
            </div>
          </dl>
          <p className="text-sm text-white/90">{cohort.capacityReason}</p>
          <ButtonLink href="/tracks" variant="inverse" arrow className="self-start">Choose My Career Track</ButtonLink>
        </div>
      </div>
    </section>
  );
}
