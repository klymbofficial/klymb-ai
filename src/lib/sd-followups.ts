import "server-only";
import { site } from "@/data/config";
import { type Db } from "@/lib/db/client";
import { inrRates, storedMarket } from "@/lib/local-price";
import { FOLLOWUP_DONE, dueFollowup } from "@/lib/followups";
import { MAIL_SUPPORT, noteEmail, sendMail } from "@/lib/mail";
import { formatMoney, priceIn } from "@/lib/pricing";
import { SD_COURSE, SD_OFFER, SD_REFERRAL, offerPath, sdPriceFor } from "@/lib/sd-offer";
import { sdLessonCounts } from "@/lib/sd-reminders";

/** At most this many per run. The hourly follow-up job runs this. */
const BATCH = 60;

/**
 * Follow-ups for a System Design claim that wasn't paid: the claim form was
 * filled in and Razorpay opened (there is an order), but no seat came of it.
 * 1 hour, 1 day and 3 days after the first order, the schedule the 30-day
 * tracks use (lib/followups), and only the latest due step on a late run.
 *
 * Any seat ends it, a refunded or revoked one too: nobody who paid hears
 * "finish your payment". Each step is claimed before the send and released
 * if the send fails, so a re-run never sends one twice.
 *
 * `only` limits a local test run to one address.
 */
export async function followUpSdClaims(sql: Db, now: Date = new Date(), only: string | null = null) {
  const { data: rows, error } = await sql.rows<{
    email: string; name: string; locked_price: number; country: string | null; followup_stage: number; started_at: string;
  }>`
    select p.email, p.name, p.locked_price, p.country, p.followup_stage, min(pay.created_at) as started_at
      from course.sd_preregistrations p
      join course.payments pay on pay.email = p.email and pay.track = ${SD_COURSE}
     where p.followup_stage < ${FOLLOWUP_DONE}
       and (${only}::text is null or p.email = ${only})
     group by p.email, p.name, p.locked_price, p.country, p.followup_stage
     order by started_at
     limit ${BATCH}
  `;
  if (error) {
    // 42703: 0023_sd_followups.sql hasn't run here yet.
    console.error("sd follow-ups: select failed:", error.code, error.message);
    return { sent: 0, error: error.code === "42703" ? "run 0023_sd_followups.sql" : error.message };
  }

  const lessons = sdLessonCounts();
  const rates = rows?.length ? await inrRates() : null;
  let sent = 0, closed = 0;
  for (const r of rows ?? []) {
    const { data: seat } = await sql.row<{ id: string }>`
      select id from course.enrollments where email = ${r.email} and course = ${SD_COURSE}
    `;
    if (seat) {
      await sql.run`update course.sd_preregistrations set followup_stage = ${FOLLOWUP_DONE} where email = ${r.email}`;
      closed++;
      continue;
    }
    const step = dueFollowup(r.followup_stage, new Date(r.started_at), now);
    if (!step) continue;

    const { data: claimed } = await sql.row<{ email: string }>`
      update course.sd_preregistrations
         set followup_stage = ${step}, followup_sent_at = ${now.toISOString()}
       where email = ${r.email} and followup_stage = ${r.followup_stage}
      returning email
    `;
    if (!claimed) continue;

    // In the currency they claimed from: the price the order will charge them.
    const market = storedMarket(r.country, rates);
    const amount = priceIn(market, sdPriceFor(r.locked_price, now));
    const mail = sdFollowupEmail(step, {
      name: r.name.split(" ")[0] || "there",
      price: formatMoney(amount, market.currency),
      amount,
      currency: market.currency,
      full: formatMoney(priceIn(market, SD_OFFER.full), market.currency),
      lessonsOut: lessons.out,
      lessonsTotal: lessons.total,
      url: `${site.url}${offerPath(`sd-followup-${step}`, true)}`,
    });
    const result = await sendMail({
      to: { email: r.email, name: r.name },
      ...mail,
      kind: `sd.followup.${step}`,
      idempotencyKey: only ? `test:${r.email}:${step}:${now.getTime()}` : `${r.email}:${step}`,
    });
    if (result.ok) sent++;
    else {
      console.error("sd follow-up failed:", step, result.reason);
      // A suppressed address won't take it on a retry either, so the claim stays.
      if (!result.skipped) {
        await sql.run`
          update course.sd_preregistrations set followup_stage = ${r.followup_stage}
           where email = ${r.email} and followup_stage = ${step}
        `;
      }
    }
  }
  return { checked: rows?.length ?? 0, sent, closed };
}

/*
 * The three follow-ups, written for a student deciding whether to buy. Every
 * promise is one the course keeps: the outline in data/system-design, the
 * refund in data/legal (sdRefund) and the referral in lib/sd-offer. No
 * deadline claims: their price is held, so "ends tonight" would be untrue.
 */
function sdFollowupEmail(
  step: 1 | 2 | 3,
  p: { name: string; price: string; amount: number; currency: string; full: string; lessonsOut: number; lessonsTotal: number; url: string },
) {
  const common = { siteUrl: site.url, supportEmail: MAIL_SUPPORT, eyebrow: "System Design", title: `Hello ${p.name},` };
  const days = p.lessonsTotal;
  const friends = `${SD_REFERRAL.friends} friends join with your link`;
  const earlyAccess = p.lessonsOut >= p.lessonsTotal
    ? `All ${days} lessons are open.`
    : `${p.lessonsOut} lessons are live today, and the rest arrive as they're ready, included in what you pay.`;

  if (step === 1) {
    return noteEmail({
      ...common,
      subject: "You were one step away from your System Design seat",
      preview: `Nothing was charged, and your seat is still held at ${p.price}.`,
      intro: `Your payment didn't go through, so nothing was charged. Your seat and your ${p.price} price are still held for you, and finishing takes about two minutes.`,
      heading: "Here's what you're about to unlock",
      points: [
        { title: "System design, from zero", body: `${days} days that start with what a client, a server and a database actually do. No experience needed.` },
        { title: "6 to 8 minutes a day, in Hinglish", body: "One shopping app that grows as you learn. Watch it on the metro, between classes, anywhere." },
        { title: "Practice that feels like the interview", body: "Real design problems, the follow-up questions interviewers ask, and answers you can say out loud." },
        { title: "It can cost you nothing", body: `Finish on schedule, one lesson a day with no missed days and 70% or higher on the final assessment, and get 100% of your fee back. Or get it back when ${friends}.` },
      ],
      cta: { href: p.url, label: "Finish my claim" },
      closing: `If the payment failed on your bank's side, trying again or ${p.currency === "INR" ? "paying by UPI" : "using another card"} usually works. Questions? Just reply to this email.`,
    });
  }

  if (step === 2) {
    return noteEmail({
      ...common,
      subject: "The interview round most students aren't ready for",
      preview: "Design a real product, out loud. Here's how this course gets you ready.",
      intro: "In software interviews, system design is the round where knowing DSA stops being enough. You're asked to design a real product, out loud, and explain every trade-off. This course gets you ready for exactly that, a few minutes a day.",
      heading: "What you'll be able to design",
      points: [
        { title: "A shopping app, from the ground up", body: "Load balancing, databases, caching, replication and queues, each one added to the same app as it grows, so it finally makes sense." },
        { title: "The classic interview problems", body: "A notification service, a news feed, ticket booking, a chat app and video streaming, worked through step by step." },
        { title: "AI system design", body: "AI assistants, RAG, latency, cost and safety: the newest part of the field, explained from the basics." },
        { title: `Still ${p.price}, and 100% back if you finish on schedule`, body: `Instead of ${p.full}. ${earlyAccess}` },
      ],
      cta: { href: p.url, label: "Claim my seat" },
      closing: "Questions before you decide? Reply to this email and a real person will answer.",
    });
  }

  // A whole unit above the daily cost, so "under" is always true.
  const perDay = formatMoney(Math.floor(p.amount / days) + 1, p.currency);
  return noteEmail({
    ...common,
    subject: `Last note: your ${p.price} System Design seat`,
    preview: "The last email we'll send about it, with the simple maths.",
    intro: "This is the last email we'll send about it, so here's the simple maths.",
    heading: "Why it's a low-risk yes",
    points: [
      { title: `Under ${perDay} a day`, body: `${p.price} for ${days} days of lessons, practice and interview prep. Less than a cup of ${p.currency === "INR" ? "chai" : "coffee"} a day.` },
      { title: "Two ways to get it all back", body: `Finish on schedule with no missed days, or have ${friends}. Either way, you keep the course.` },
      { title: "Start any day you like", body: "No live class to miss. One short lesson a day, whenever suits you that day." },
      { title: "Your seat is still held", body: `At ${p.price} instead of ${p.full}, whenever you're ready.` },
    ],
    cta: { href: p.url, label: `Claim my seat for ${p.price}` },
    closing: "If now isn't the right time, no problem, and thank you for your interest. If it is, we'd love to see you on Day 1.",
  });
}
