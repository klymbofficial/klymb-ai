/**
 * The launch price: every paid track at ₹449 until the end of 31 October
 * 2026 (IST), then back to its list price. Pure, so it is unit-tested and
 * usable in the browser. Change PRICE or ENDS here to adjust the offer.
 */
export const LAUNCH_OFFER = {
  price: 449,
  /** Exclusive end: midnight IST at the start of 1 November. */
  endsAt: "2026-11-01T00:00:00+05:30",
  endsLabel: "31 October",
} as const;

export function offerOpen(now: Date = new Date()) {
  return now < new Date(LAUNCH_OFFER.endsAt);
}

/** What a learner pays right now. Free tracks stay free; the offer never raises a price. */
export function priceNow(listPrice: number, now: Date = new Date()) {
  if (listPrice <= 0) return 0;
  return offerOpen(now) ? Math.min(LAUNCH_OFFER.price, listPrice) : listPrice;
}
