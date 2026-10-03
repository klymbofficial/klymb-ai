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
  const preview = `Payment confirmed. Your ${p.trackName} cohort starts ${p.startDate}.`;
  const text = [
    `Hi ${p.name},`,
    "",
    `Thank you for joining the Klymb.ai ${p.trackName} cohort. Your payment is confirmed and your seat is reserved.`,
    "",
    `Amount paid: ${p.amount}`,
    `Payment ID: ${p.paymentId}`,
    `Cohort starts: ${p.startDate}`,
    "",
    "What happens next",
    `1. Sign in with this email at ${p.siteUrl}/learn`,
    `2. Day 1 opens on ${p.startDate}. One real workplace problem a day, about 90 to 120 minutes.`,
    "3. Finish all 30 days and we refund 100% of your fee.",
    "",
    `Questions? Reply to this email or write to ${p.supportEmail}.`,
    "",
    "Team Klymb.ai",
  ].join("\n");

  const site = esc(p.siteUrl);
  const C = { maroon: "#83050b", ink: "#201e1d", muted: "#6b6866", line: "#ece9e8", paper: "#f3f2f2", pink: "#f0868b" };
  // Gmail auto-links text that looks like a domain (KLYMB.AI): make it a real link, styled, so it stays white.
  const wordmark = (color: string) =>
    `<a href="${site}" style="color:${color};text-decoration:none;font-weight:900;letter-spacing:-0.5px">KLYMB<span style="color:${C.pink}">.AI</span></a>`;
  const row = (k: string, v: string) =>
    `<tr><td style="padding:10px 0;color:${C.muted};font-size:14px;border-bottom:1px solid ${C.line}">${k}</td><td style="padding:10px 0;text-align:right;font-weight:700;font-size:14px;color:${C.ink};border-bottom:1px solid ${C.line}">${esc(v)}</td></tr>`;
  const step = (n: number, title: string, body: string) =>
    `<tr><td style="padding:0 14px 16px 0;vertical-align:top;width:30px"><div style="width:28px;height:28px;border-radius:14px;background:${C.maroon};color:#fff;font-weight:800;font-size:13px;line-height:28px;text-align:center">${n}</div></td><td style="padding:0 0 16px;vertical-align:top"><div style="font-weight:700;font-size:15px;color:${C.ink}">${title}</div><div style="font-size:13px;line-height:1.55;color:${C.muted};margin-top:2px">${body}</div></td></tr>`;

  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"></head>
<body style="margin:0;background:${C.paper};font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${C.ink}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preview)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">

<tr><td style="background:${C.maroon};background-image:linear-gradient(135deg,#a50d16,${C.maroon} 55%,#4a0206);border-radius:18px 18px 0 0;padding:26px 30px 30px">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td style="padding-right:12px;vertical-align:middle"><img src="${site}/email/klymb-icon.png" width="34" height="34" alt="" style="display:block;border:0;border-radius:9px"></td>
    <td style="vertical-align:middle;font-size:19px">${wordmark("#ffffff")}</td>
  </tr></table>
  <div style="margin-top:26px;font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#ffd0cd">Payment confirmed</div>
  <div style="margin-top:6px;font-size:30px;line-height:1.15;font-weight:900;color:#fff;letter-spacing:-0.5px">You're in, ${esc(p.name)}.</div>
  <div style="margin-top:8px;font-size:15px;line-height:1.55;color:#ffe4e2">Your seat on the <strong style="color:#fff">${esc(p.trackName)}</strong> cohort is reserved.</div>
</td></tr>

<tr><td style="background:#ffffff;padding:28px 30px 8px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${C.line}">
    ${row("Amount paid", p.amount)}${row("Payment ID", p.paymentId)}${row("Cohort starts", p.startDate)}
  </table>
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 6px"><tr><td style="border-radius:999px;background:${C.maroon}">
    <a href="${site}/learn" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none">Open my dashboard &rarr;</a>
  </td></tr></table>
</td></tr>

<tr><td style="background:#ffffff;padding:22px 30px 10px">
  <div style="font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:${C.maroon};margin-bottom:14px">What happens next</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${step(1, "Sign in with this email", "Use Continue with Google on the sign-in page, with the same email you paid with.")}
    ${step(2, `Day 1 opens on ${esc(p.startDate)}`, "One real workplace problem a day, about 90 to 120 minutes. Your course also works offline.")}
    ${step(3, "Finish all 30 days, get 100% back", `Submit every day, defend the four checkpoints and attend both mock interviews. <a href="${site}/refund-policy" style="color:${C.maroon}">How the refund works</a>`)}
  </table>
</td></tr>

<tr><td style="background:#ffffff;border-radius:0 0 18px 18px;padding:6px 30px 28px">
  <div style="border-top:1px solid ${C.line};padding-top:18px;font-size:13px;line-height:1.6;color:${C.muted}">
    Questions? Just reply to this email, or write to <a href="mailto:${esc(p.supportEmail)}" style="color:${C.ink};font-weight:600">${esc(p.supportEmail)}</a>.
  </div>
</td></tr>

<tr><td align="center" style="padding:22px 10px 0;font-size:12px;line-height:1.7;color:#8a8785">
  ${wordmark(C.ink)}<br>
  <a href="${site}/tracks" style="color:#8a8785">Career tracks</a> &nbsp;·&nbsp; <a href="${site}/refund-policy" style="color:#8a8785">Refund policy</a> &nbsp;·&nbsp; <a href="${site}/contact" style="color:#8a8785">Contact</a><br>
  Klymb.ai, a programme of Creators Enterprises Private Limited
</td></tr>

</table></td></tr></table></body></html>`;

  return { subject, html, text };
}
