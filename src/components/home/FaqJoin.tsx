import Image from "next/image";
import { faqs, sectionCopy, urgency } from "@/data/program";
import { refund } from "@/data/legal";
import { Accordion } from "@/components/ui/Accordion";
import { Eyebrow } from "@/components/ui/Eyebrow";
import type { TrackSlug } from "@/types/program";
import { RegistrationForm } from "./RegistrationForm";
import pointing from "@/assets/join-pointing.png";

/**
 * The closing section: every remaining question on the left, and the thing
 * we want the reader to do on the right.
 */
export function FaqJoin({ defaultTrack }: { defaultTrack?: TrackSlug }) {
  return (
    <section id="faq" aria-labelledby="faq-title" className="bg-card">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:gap-16">
        <div>
          <Eyebrow>{sectionCopy.faq.eyebrow}</Eyebrow>
          <h2 id="faq-title" className="display mt-3 text-[clamp(1.85rem,4vw,2.75rem)]">{sectionCopy.faq.title}</h2>
          <p className="mt-3 text-sm text-muted">{sectionCopy.faq.intro}</p>
          <div className="mt-8"><Accordion items={faqs} variant="card" /></div>
        </div>

        <div id="register" className="scroll-mt-28">
          {/* He points at the form; the bubble sits to his right, as drawn. */}
          <div className="relative z-10 flex items-end gap-0">
            <Image
              src={pointing}
              alt=""
              aria-hidden="true"
              sizes="(min-width: 640px) 16rem, 40vw"
              className="-mb-4 w-36 shrink-0 select-none sm:w-60"
            />
            <div className="relative mb-6 flex-1 rounded-card border-2 border-ink bg-card p-5 sm:p-6">
              <Eyebrow>Join the cohort</Eyebrow>
              <p className="mt-2 text-base font-extrabold leading-snug text-balance sm:text-lg">{urgency.headline}</p>
              <p className="mt-2 text-sm text-muted">{urgency.support}</p>
              {/* The tail, pointing back at him. */}
              <span aria-hidden="true" className="absolute top-8 -left-[11px] size-5 rotate-45 border-b-2 border-l-2 border-ink bg-card" />
            </div>
          </div>

          <div className="card p-6 sm:p-8">
            <h3 className="text-xl font-extrabold">Reserve your seat</h3>
            <p className="mt-1 text-sm text-muted">{refund.headline}</p>
            <div className="mt-6"><RegistrationForm defaultTrack={defaultTrack} bare /></div>
          </div>
        </div>
      </div>
    </section>
  );
}
