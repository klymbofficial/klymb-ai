import { enrolment } from "@/data/config";
import { priceFrom } from "@/data/tracks";
import { formatINR } from "@/lib/format";
import { LAUNCH_OFFER, offerOpen } from "@/lib/offer";

/**
 * A single-line ticker instead of a block that wraps to three lines on a
 * phone. The items are rendered twice so the loop is seamless; the copy is
 * hidden from screen readers. Hover pauses it, and reduced motion stops it.
 */
export function AnnouncementBar() {
  const items = [
    ...(offerOpen() ? [`Launch offer: ${formatINR(LAUNCH_OFFER.discount)} off, first ${LAUNCH_OFFER.seats} learners, ends ${LAUNCH_OFFER.endsLabel}`] : []),
    "Day 1 free on every track",
    "Start any day: Day 1 opens when you enrol",
    `${enrolment.dailyTime}, in your own time`,
    `Tracks from ${formatINR(priceFrom)}`,
    "100% fee back when you complete",
    "Individual feedback every week",
  ];

  const row = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {items.map((item) => (
        <li key={item} className="flex items-center gap-4 pr-4 whitespace-nowrap">
          <span className="tick" aria-hidden="true">✦</span>
          {item}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="marquee overflow-hidden bg-red-strong py-2 text-xs font-bold uppercase tracking-[0.08em] text-white">
      <div className="marquee-track flex w-max">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
