import "server-only";
import { renderTemplate, type InviteTemplate } from "@/lib/company/test-settings";
import { loadTestSettings } from "@/lib/company/test-settings-data";
import { site } from "@/data/config";
import type { CompanyBrand } from "@/lib/company/brand";
import { candidateLink } from "@/lib/company/batch-link";
import { recordMail, type Batch, type MailTarget } from "@/lib/company/batch-data";
import { PREP_COURSES, allowedMinutes, deadlineText, deliveryError, durationText, lastStart, type MailKind } from "@/lib/company/batch-rules";
import { loadCompanyBrand } from "@/lib/company/invite";
import type { Db } from "@/lib/db/client";
import { MAIL_SUPPORT, candidateInviteEmail, sendMail } from "@/lib/mail";

/**
 * Where candidate links point: the live site, or outside production the
 * local server AUTH_URL names, so a link in a test email opens the page
 * that signed it.
 */
export function linkBase(): string {
  const local = process.env.NODE_ENV !== "production" ? process.env.AUTH_URL : undefined;
  try {
    return local ? new URL(local).origin : site.url;
  } catch {
    return site.url;
  }
}

/** Where a prep course opens for a candidate. */
const PREP_URL: Record<string, string> = { "system-design": "/learn/system-design" };

/**
 * The email one person gets, for a preview or to send. Null without a link
 * (no AUTH_SECRET here). `template` is the company's own invitation for this
 * test (U06a), used for invitations only, its variables filled in for them.
 */
export function buildCandidateMail(
  kind: MailKind, batch: Batch, brand: CompanyBrand, t: Pick<MailTarget, "id" | "name" | "email" | "generation" | "extraMinutes" | "lastStartAt">,
  now = new Date(), template: InviteTemplate | null = null,
) {
  const base = linkBase();
  const link = candidateLink(base, t.id, t.generation);
  if (!link) return null;
  const last = lastStart({ closesAt: batch.closesAt, minutes: batch.minutes }, t);
  const vars = {
    candidate_name: t.name,
    test_name: batch.title,
    company: brand.name,
    start_by: deadlineText(last, batch.timeZone),
    time_allowed: durationText(allowedMinutes(batch.minutes, t.extraMinutes)),
  };
  return candidateInviteEmail({
    template: template ? { subject: renderTemplate(template.subject, vars), body: renderTemplate(template.body, vars) } : null,
    kind,
    name: t.name,
    email: t.email,
    company: brand,
    title: batch.title,
    role: batch.role,
    internal: batch.purpose === "internal",
    opens: deadlineText(batch.opensAt, batch.timeZone),
    lastStart: deadlineText(last, batch.timeZone),
    allowed: durationText(allowedMinutes(batch.minutes, t.extraMinutes)),
    opened: new Date(batch.opensAt) <= now,
    link,
    prep: batch.prepCourse
      ? { course: PREP_COURSES[batch.prepCourse], url: `${base}${PREP_URL[batch.prepCourse]}`, until: deadlineText(batch.closesAt, batch.timeZone) }
      : null,
    siteUrl: base,
    supportEmail: MAIL_SUPPORT,
  });
}

export interface SendReport {
  sent: number;
  failed: number;
}

/**
 * Sends one kind of email to people already claimed, a few at a time, and
 * records each outcome. Never throws: a failure is written against the person
 * so the recruiter can see it and retry.
 */
export async function deliver(sql: Db, batch: Batch, kind: MailKind, targets: MailTarget[], by: string | null, brandIn?: CompanyBrand | null): Promise<SendReport> {
  const report: SendReport = { sent: 0, failed: 0 };
  if (!targets.length) return report;
  const brand = brandIn ?? (await loadCompanyBrand(sql, batch.companyId));
  // The company's own invitation for this test, if it wrote one (U06a). Unreadable settings send the standard email.
  const template = kind === "invite" ? ((await loadTestSettings(sql, batch.companyId, batch.item))?.invite ?? null) : null;
  const queue = [...targets];

  async function one(t: MailTarget) {
    let outcome: "sent" | "failed" | "skipped" = "failed";
    let error: string | null = null;
    try {
      const mail = brand ? buildCandidateMail(kind, batch, brand, t, new Date(), template) : null;
      if (!mail) {
        error = brand ? "Links can't be made on this server (no AUTH_SECRET)." : "The company's details couldn't be read.";
      } else {
        const { fromName, replyTo, ...content } = mail;
        const out = await sendMail({ to: { email: t.email, name: t.name }, fromName, replyTo, ...content, kind: `company.batch_${kind}` });
        if (out.ok) outcome = "sent";
        else {
          outcome = out.skipped ? "skipped" : "failed";
          error = deliveryError(out.reason);
        }
      }
    } catch (e) {
      error = deliveryError(e instanceof Error ? e.message : String(e));
    }
    await recordMail(sql, { candidateId: t.id, kind, generation: t.generation, outcome, error, by });
    if (outcome === "sent") report.sent += 1;
    else report.failed += 1;
  }

  const workers = Array.from({ length: Math.min(4, queue.length) }, async () => {
    for (let t = queue.shift(); t; t = queue.shift()) await one(t);
  });
  await Promise.all(workers);
  return report;
}
