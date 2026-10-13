/**
 * The launch offer: ₹2,000 off for the first 50 paid learners, until the end
 * of 31 October 2026 (IST). Pure, so it is unit-tested and usable in the
 * browser; the server counts seats taken and passes them in.
 */
export const LAUNCH_OFFER = {
  discount: 2000,
  seats: 50,
  /** Exclusive end: midnight IST at the start of 1 November. */
  endsAt: "2026-11-01T00:00:00+05:30",
  endsLabel: "31 October",
  /** Only payments from this date count against the 50 seats. */
  startsAt: "2026-10-13T00:00:00+05:30",
} as const;

export function offerOpen(now: Date = new Date(), seatsTaken = 0) {
  return now < new Date(LAUNCH_OFFER.endsAt) && seatsTaken < LAUNCH_OFFER.seats;
}

/** What a learner pays right now. Free tracks stay free. */
export function priceNow(listPrice: number, now: Date = new Date(), seatsTaken = 0) {
  if (listPrice <= 0) return 0;
  return offerOpen(now, seatsTaken) ? listPrice - LAUNCH_OFFER.discount : listPrice;
}
