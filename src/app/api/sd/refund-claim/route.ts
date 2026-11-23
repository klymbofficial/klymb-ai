import { NextResponse } from "next/server";
import { currentEmail } from "@/auth";
import { site } from "@/data/config";
import { hasCourseAccess } from "@/lib/access";
import { db } from "@/lib/db/client";
import { MAIL_SUPPORT, sdRefundClaimedEmail, sendMail } from "@/lib/mail";
import { formatMinor } from "@/lib/pricing";
import { checkRateLimit } from "@/lib/rate-limit";
import { SD_COURSE } from "@/lib/sd-offer";
import { FINAL_MARK, paceOf } from "@/lib/sd-pace";
import { sdProgress } from "@/lib/sd-progress";

/** How long after passing the final a refund can be claimed here. Later, they write to us. */
const CLAIM_DAYS = 60;

/**
 * Claims the completion refund. The server works out, from its own record,
 * that they finished on schedule, then stamps the payment once. A second
 * press finds the stamp and sends nothing again. The refund itself is still
 * issued by the owner from Admin → Payments.
 */
export async function POST() {
  const email = await currentEmail();
  if (!email || !(await hasCourseAccess(email, SD_COURSE))) return NextResponse.json({ error: "Sign in with the account you paid with." }, { status: 403 });

  const limit = await checkRateLimit("sd_refund_claim", { limit: 10, windowMinutes: 60, identity: email });
  if (!limit.allowed) return NextResponse.json({ error: "Too many tries. Please try again later." }, { status: 429 });

  const sql = db();
  const progress = await sdProgress(email, sql);
  if (!sql || !progress) return NextResponse.json({ error: "We couldn’t check your course right now. Please try again." }, { status: 500 });
  if (progress.refundClaimedAt) return NextResponse.json({ claimedAt: progress.refundClaimedAt });

  const pace = paceOf(progress);
  if (!pace.refundable || pace.refund !== "earned") return NextResponse.json({ error: "This seat hasn’t earned the completion refund." }, { status: 403 });
  const won = progress.finals.filter((f) => f.score >= FINAL_MARK).sort((a, b) => a.at.localeCompare(b.at))[0];
  if (won && Date.now() - Date.parse(won.at) > CLAIM_DAYS * 864e5) {
    return NextResponse.json({ error: `Claims here close ${CLAIM_DAYS} days after the final. Write to ${MAIL_SUPPORT} from the email you paid with.` }, { status: 403 });
  }

  const { data: claimed, error } = await sql.row<{ refund_claimed_at: string; amount: number; currency: string; razorpay_payment_id: string | null; name: string | null }>`
    update course.payments p
       set refund_claimed_at = now()
      from course.enrollments e
      left join course.sd_preregistrations l on l.email = e.email
     where e.email = ${email} and e.course = ${SD_COURSE} and e.status = 'active' and e.source = 'payment'
       and p.id = e.payment_id and p.status = 'paid' and p.refund_claimed_at is null
    returning p.refund_claimed_at, p.amount, p.currency, p.razorpay_payment_id, l.name
  `;
  if (error) {
    console.error("refund claim failed:", error.code, error.message);
    return NextResponse.json({ error: "We couldn’t record your claim. Please try again." }, { status: 500 });
  }
  if (!claimed) {
    // Lost a race with another press: whatever stamped it already sent the emails.
    const again = await sdProgress(email, sql);
    if (again?.refundClaimedAt) return NextResponse.json({ claimedAt: again.refundClaimedAt });
    return NextResponse.json({ error: "We couldn’t find a paid seat to refund." }, { status: 404 });
  }

  const amount = formatMinor(claimed.amount, claimed.currency);
  const name = claimed.name?.trim().split(/\s+/)[0] || "there";
  const [toLearner, toTeam] = await Promise.all([
    sendMail({ to: { email, name: claimed.name ?? undefined }, ...sdRefundClaimedEmail({ name, amount, siteUrl: site.url, supportEmail: MAIL_SUPPORT }), kind: "sd.refund_claimed", idempotencyKey: `sd-refund-claimed:${email}` }),
    sendMail({
      to: { email: MAIL_SUPPORT },
      subject: `Completion refund claimed: ${email}`,
      text: `${email} finished System Design on schedule and claimed their completion refund.\n\nAmount: ${amount}\nPayment: ${claimed.razorpay_payment_id ?? "?"}\n\nCheck and refund it from ${site.url}/admin/payments within 14 working days.`,
      html: `<p>${email.replace(/[<>&"]/g, "")} finished System Design on schedule and claimed their completion refund.</p><p>Amount: ${amount}<br>Payment: ${claimed.razorpay_payment_id ?? "?"}</p><p>Check and refund it from <a href="${site.url}/admin/payments">Admin → Payments</a> within 14 working days.</p>`,
      kind: "sd.refund_claimed_team", idempotencyKey: `sd-refund-claimed-team:${email}`,
    }),
  ]);
  if (!toLearner.ok) console.error("refund claim email failed:", toLearner.reason);
  if (!toTeam.ok) console.error("refund claim team email failed:", toTeam.reason);
  return NextResponse.json({ claimedAt: new Date(claimed.refund_claimed_at).toISOString() });
}
