import { PayButton } from "@/components/home/PayButton";
import { cohort } from "@/data/config";
import type { Track } from "@/types/program";
import { formatINR } from "@/lib/format";
import { createServiceClient } from "@/lib/supabase/admin";

/**
 * Shown on the learner dashboard until this learner's seat is paid for, so
 * anyone who registered before checkout existed, or closed the popup, can pay.
 * Hidden entirely if the payment lookup is unavailable: never nag in error.
 */
export async function PaymentNotice({ email, track }: { email: string; track: Track }) {
  if (track.price === 0) return null; // free track: nothing to confirm
  const supabase = createServiceClient();
  if (!supabase || !process.env.RAZORPAY_KEY_ID) return null;

  const { data, error } = await supabase
    .from("payments")
    .select("id")
    .eq("email", email)
    .eq("cohort_start", cohort.startDate)
    .eq("status", "paid")
    .limit(1);
  if (error || data?.length) return null;

  return (
    <div className="border-b border-line/30 bg-red-tint">
      <div className="mx-auto flex max-w-[96rem] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-8">
        <div>
          <p className="font-extrabold text-ink">Confirm your seat on the {track.name} cohort</p>
          <p className="mt-0.5 text-sm text-muted">
            {formatINR(track.price)}, and 100% of it back when you complete all 30 days.
          </p>
        </div>
        <PayButton email={email} price={track.price} tone="light" />
      </div>
    </div>
  );
}
