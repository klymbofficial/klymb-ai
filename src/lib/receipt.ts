import "server-only";
import { cohort, site } from "@/data/config";
import { grievance } from "@/data/legal";
import { getTrack } from "@/data/tracks";
import { formatDate, formatINR } from "@/lib/format";
import { sendMail, thankYouEmail } from "@/lib/mail";
import { createServiceClient } from "@/lib/supabase/admin";

/**
 * Sends the thank-you email for one paid order, at most once.
 *
 * The row is claimed by setting receipt_sent_at from null in one UPDATE, so
 * two callers (a retried verify, a later webhook) can never both send. If the
 * send then fails, the claim is released so a later call can try again.
 */
export async function sendReceiptOnce(orderId: string) {
  const supabase = createServiceClient();
  if (!supabase || !process.env.BREVO_API_KEY) return;

  const { data: pay } = await supabase
    .from("payments")
    .update({ receipt_sent_at: new Date().toISOString() })
    .eq("razorpay_order_id", orderId)
    .eq("status", "paid")
    .is("receipt_sent_at", null)
    .select("id, email, track, amount, razorpay_payment_id, cohort_start")
    .maybeSingle();
  if (!pay) return;

  const { data: reg } = await supabase
    .from("registrations")
    .select("name")
    .eq("email", pay.email)
    .eq("cohort_start", pay.cohort_start)
    .maybeSingle();

  const name = reg?.name?.split(" ")[0] || "there";
  const mail = thankYouEmail({
    name,
    trackName: getTrack(pay.track)?.name ?? pay.track,
    amount: formatINR(pay.amount / 100),
    paymentId: pay.razorpay_payment_id ?? orderId,
    startDate: formatDate(pay.cohort_start ?? cohort.startDate),
    siteUrl: site.url,
    supportEmail: grievance.email,
  });

  const sent = await sendMail({ to: { email: pay.email, name: reg?.name ?? undefined }, ...mail });
  if (!sent.ok) {
    console.error("thank-you email failed:", orderId, sent.reason);
    await supabase.from("payments").update({ receipt_sent_at: null }).eq("id", pay.id);
  }
}
