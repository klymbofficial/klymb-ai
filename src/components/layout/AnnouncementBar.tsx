import { HIDE_MONEY } from "@/lib/site-status";
import { enrolment } from "@/data/config";
import { allFree, priceFrom } from "@/data/tracks";
import { formatINR } from "@/lib/format";
import { LAUNCH_OFFER, offerOpen } from "@/lib/offer";

/**
 * Each line names what it is about, the 30-day tracks or System Design, because
 * the bar sits on both products' pages and their daily time differs.
 *
 * A single-line ticker instead of a block that wraps to three lines on a
 * phone. The items are rendered twice so the loop is seamless; the copy is
 * hidden from screen readers. Hover pauses it, and reduced motion stops it.
 */
export function AnnouncementBar() {
  const items = HIDE_MONEY ? [
    "30-day tracks: start any day, Day 1 opens when you enrol",
    `30-day tracks: ${enrolment.dailyTime}, in your own time`,
    "System Design: 15 minutes a day, on your phone",
    "Hands-on work and interview prep",
  ] : allFree ? [
    "Every course is free right now",
    "30-day tracks: start any day, Day 1 opens when you enrol",
    `30-day tracks: ${enrolment.dailyTime}, in your own time`,
    "System Design: 15 minutes a day, on your phone",
    "Hands-on work and interview prep",
  ] : [
    ...(offerOpen() ? [`Launch price: every track ${formatINR(LAUNCH_OFFER.price)} until ${LAUNCH_OFFER.endsLabel}`] : []),
    "Day 1 free on every track",
    "30-day tracks: start any day, Day 1 opens when you enrol",
    `30-day tracks: ${enrolment.dailyTime}, in your own time`,
    "System Design: 15 minutes a day, on your phone",
    ...(offerOpen() ? [] : [`Tracks from ${formatINR(priceFrom)}`]),
    "100% fee back when you complete",
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
