import { PayButton } from "@/components/home/PayButton";
import type { Track } from "@/types/program";
import { formatINR } from "@/lib/format";
import { hasPaid } from "@/lib/access";
import { LAUNCH_OFFER, offerOpen, priceNow } from "@/lib/offer";

/**
 * Shown on the learner dashboard until this learner has paid: Day 1 is free,
 * this unlocks Days 2 to 30, with the launch offer while it is open. Uses the
 * same paid check as the day lock, so the two always agree.
 */
export async function PaymentNotice({ email, track }: { email: string; track: Track }) {
  if (track.price === 0) return null; // free track: nothing to unlock
  if (!process.env.RAZORPAY_KEY_ID || (await hasPaid(email, track.slug))) return null;

  const offer = offerOpen();
  const price = priceNow(track.price);

  return (
    <div className="border-b border-line/30 bg-red-tint">
      <div className="mx-auto flex max-w-[96rem] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-8">
        <div>
          <p className="font-extrabold text-ink">Day 1 is free. Unlock Days 2 to 30 of the {track.name} course</p>
          <p className="mt-0.5 text-sm text-muted">
            {offer ? (
              <>
                <strong className="text-ink">{formatINR(price)}</strong>{" "}
                <span className="line-through">{formatINR(track.price)}</span> · launch price until {LAUNCH_OFFER.endsLabel} ·{" "}
              </>
            ) : (
              <>{formatINR(price)} · </>
            )}
            100% back when you complete all 30 days.
          </p>
        </div>
        <PayButton email={email} price={price} tone="light" />
      </div>
    </div>
  );
}
