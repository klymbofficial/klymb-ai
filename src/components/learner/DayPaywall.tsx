import Link from "next/link";
import { Lock } from "lucide-react";
import { PayButton } from "@/components/home/PayButton";
import { LAUNCH_OFFER, offerOpen, priceNow } from "@/lib/offer";
import { formatINR } from "@/lib/format";
import type { Track } from "@/types/program";

/**
 * Days 2 to 30 before payment: what this day is, what unlocking gives, and the
 * price with the launch offer when it is open. Day 1 stays free, so learners
 * pay after seeing the work, not before.
 */
export function DayPaywall({
  email, track, day, title, seatsTaken,
}: { email: string; track: Track; day: number; title: string; seatsTaken: number }) {
  const now = new Date();
  const offer = offerOpen(now, seatsTaken);
  const price = priceNow(track.price, now, seatsTaken);
  const seatsLeft = Math.max(0, LAUNCH_OFFER.seats - seatsTaken);

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center sm:py-24">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-red-tint text-red-deep">
        <Lock aria-hidden="true" className="size-6" />
      </span>
      <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.16em] text-red-deep">Day {day} · {track.name}</p>
      <h1 className="display mt-3 text-[clamp(1.8rem,4vw,2.6rem)] text-balance">{title}</h1>
      <p className="mt-4 text-muted">
        You&apos;ve seen Day 1. Unlock the full course to keep going: Days 2 to 30, four graded checkpoints and two mock interviews.
      </p>

      <div className="mt-8 rounded-card bg-surface p-6 text-left ring-1 ring-line/30">
        {offer && (
          <p className="mb-2 inline-flex rounded-full bg-red-strong px-3 py-1 text-xs font-bold text-white">
            Launch offer: {formatINR(LAUNCH_OFFER.discount)} off · {seatsLeft} of {LAUNCH_OFFER.seats} seats left · ends {LAUNCH_OFFER.endsLabel}
          </p>
        )}
        <p className="flex items-baseline gap-3">
          <span className="display text-4xl tabular-nums">{formatINR(price)}</span>
          {offer && <span className="text-lg text-muted line-through tabular-nums">{formatINR(track.price)}</span>}
        </p>
        <p className="mt-1 text-sm text-muted">
          One payment. 100% back when you complete all 30 days.{" "}
          <Link href="/refund-policy" className="font-semibold underline underline-offset-2">How the refund works</Link>
        </p>
        <PayButton email={email} price={price} tone="light" />
      </div>

      <Link href="/learn/day/1" className="mt-6 inline-block text-sm font-semibold text-muted underline underline-offset-4 hover:text-ink">
        Back to Day 1
      </Link>
    </div>
  );
}

/** A day whose previous day isn't submitted yet: days unlock in order. */
export function DayLocked({ day, title, previousDay, previousTitle }: { day: number; title: string; previousDay: number; previousTitle: string }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center sm:py-24">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-surface text-muted">
        <Lock aria-hidden="true" className="size-6" />
      </span>
      <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.16em] text-muted">Day {day} · opens next</p>
      <h1 className="display mt-3 text-[clamp(1.8rem,4vw,2.6rem)] text-balance">{title}</h1>
      <p className="mt-4 text-muted">
        Days unlock in order, so each one builds on the last. Submit Day {previousDay} and this day opens straight away.
      </p>
      <Link
        href={`/learn/day/${previousDay}`}
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-red-strong px-6 py-3 text-sm font-bold text-white transition-[background-color,transform] duration-150 hover:bg-red-press active:scale-[0.97]"
      >
        Go to Day {previousDay}{previousTitle ? `: ${previousTitle}` : ""}
      </Link>
    </div>
  );
}
