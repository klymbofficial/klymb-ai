import "server-only";

/**
 * Transactional email through Brevo's HTTP API.
 *
 * Needs BREVO_API_KEY and MAIL_FROM (an address on a domain verified in
 * Brevo). Without them nothing is sent and callers carry on: an email must
 * never be the reason a payment fails to record.
 */
export async function sendMail({ to, subject, html, text }: { to: { email: string; name?: string }; subject: string; html: string; text: string }) {
  const apiKey = process.env.BREVO_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!apiKey || !from) return { ok: false as const, reason: "not configured" };

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      sender: { email: from, name: "Klymb.ai" },
      to: [to],
      replyTo: { email: process.env.MAIL_REPLY_TO || from },
      subject,
      htmlContent: html,
      textContent: text,
    }),
    cache: "no-store",
  }).catch(() => null);

  if (!res?.ok) return { ok: false as const, reason: `brevo ${res?.status ?? "unreachable"}` };
  return { ok: true as const };
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** The receipt and welcome sent once a payment verifies. */
export function thankYouEmail(p: { name: string; trackName: string; amount: string; paymentId: string; startDate: string; siteUrl: string; supportEmail: string }) {
  const subject = `You're in: ${p.trackName} cohort`;
  const text = [
    `Hi ${p.name},`,
    "",
    `Thank you for joining the Klymb.ai ${p.trackName} cohort. Your payment is confirmed and your seat is reserved.`,
    "",
    `Amount paid: ${p.amount}`,
    `Payment ID: ${p.paymentId}`,
    `Cohort starts: ${p.startDate}`,
    "",
    `Sign in with this email to start: ${p.siteUrl}/learn`,
    "",
    "Complete all 30 days and we refund 100% of your fee. The conditions are on our Refund Policy page.",
    "",
    `Questions? Reply to this email or write to ${p.supportEmail}.`,
    "",
    "Team Klymb.ai",
  ].join("\n");

  const row = (k: string, v: string) =>
    `<tr><td style="padding:6px 0;color:#6b6b6b">${k}</td><td style="padding:6px 0;text-align:right;font-weight:700">${esc(v)}</td></tr>`;

  const html = `<!doctype html><html><body style="margin:0;background:#f3f2f2;font-family:Arial,Helvetica,sans-serif;color:#201e1d">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#83050b;padding:18px 28px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="padding-right:12px;vertical-align:middle"><img src="${esc(p.siteUrl)}/email/klymb-icon.png" width="36" height="36" alt="Klymb.ai" style="display:block;border:0;border-radius:8px"></td><td style="vertical-align:middle;color:#ffffff;font-size:20px;font-weight:900;letter-spacing:-0.5px">KLYMB.AI</td></tr></table></td></tr>
<tr><td style="padding:28px">
<p style="margin:0 0 6px;font-size:24px;font-weight:900">You're in, ${esc(p.name)}.</p>
<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#4a4745">Thank you for joining the <strong>${esc(p.trackName)}</strong> cohort. Your payment is confirmed and your seat is reserved.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;border-top:1px solid #eee;border-bottom:1px solid #eee;margin-bottom:22px">
${row("Amount paid", p.amount)}${row("Payment ID", p.paymentId)}${row("Cohort starts", p.startDate)}
</table>
<a href="${esc(p.siteUrl)}/learn" style="display:inline-block;background:#83050b;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 24px;border-radius:999px">Start Day 1</a>
<p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:#4a4745">Complete all 30 days and we refund 100% of your fee. The conditions are on our <a href="${esc(p.siteUrl)}/refund-policy" style="color:#83050b">Refund Policy</a> page.</p>
<p style="margin:12px 0 0;font-size:13px;line-height:1.6;color:#4a4745">Questions? Reply to this email or write to ${esc(p.supportEmail)}.</p>
</td></tr></table>
<p style="font-size:11px;color:#8a8785;margin:14px 0 0">Klymb.ai, a programme of Creators Enterprises Private Limited</p>
</td></tr></table></body></html>`;

  return { subject, html, text };
}
