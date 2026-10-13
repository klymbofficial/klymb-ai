"use client";

import clsx from "clsx";
import { useSyncExternalStore } from "react";
import { formatINR } from "@/lib/format";
import { offerOpen, priceNow } from "@/lib/offer";

// The date is read on each render in the browser and once on the server, so
// a cached page stops showing the offer the moment it ends.
const noop = () => () => {};
const useOfferOpen = () => useSyncExternalStore(noop, () => offerOpen(), () => offerOpen());

/**
 * A list price with the launch offer applied: the offer price, then the list
 * price struck through. Re-checks the date in the browser, so a cached page
 * stops showing the offer the moment it ends. Seats are counted on the server
 * when an order is created; this shows the date-limited offer only.
 */
export function OfferPrice({ listPrice, className, strikeClassName }: { listPrice: number; className?: string; strikeClassName?: string }) {
  const open = useOfferOpen();
  if (listPrice <= 0) return <span className={className}>Free</span>;
  return (
    <>
      <span className={className}>{formatINR(open ? priceNow(listPrice) : listPrice)}</span>
      {open && <span className={clsx("line-through opacity-60", strikeClassName)}>{formatINR(listPrice)}</span>}
    </>
  );
}

/** A one-line badge for the offer, hidden once it has ended. */
export function OfferBadge({ className }: { className?: string }) {
  const open = useOfferOpen();
  if (!open) return null;
  return <span className={className}>Launch offer: ₹2,000 off for the first 50 learners · ends 31 October</span>;
}
