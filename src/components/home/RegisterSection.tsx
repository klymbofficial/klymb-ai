import { cohort } from "@/data/config";
import { urgency } from "@/data/program";
import { formatDate } from "@/lib/format";
import { Eyebrow } from "@/components/ui/Eyebrow";
import type { TrackSlug } from "@/types/program";
import { RegistrationForm } from "./RegistrationForm";

export function RegisterSection({ defaultTrack }: { defaultTrack?: TrackSlug }) {
  return (
    <section id="register" aria-labelledby="register-title" className="border-b-2 border-line py-14 sm:py-20">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.3fr]">
        <div>
          <Eyebrow>Registration</Eyebrow>
          <h2 id="register-title" className="display mt-3 text-4xl text-balance sm:text-5xl">{urgency.headline}</h2>
          <p className="mt-5 text-lg text-muted">
            The cohort starts on {formatDate(cohort.startDate)}. {cohort.capacityReason}
          </p>
        </div>
        <RegistrationForm defaultTrack={defaultTrack} />
      </div>
    </section>
  );
}
