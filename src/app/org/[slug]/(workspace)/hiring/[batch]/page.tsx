import clsx from "clsx";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BatchButtons, SendDraft } from "@/components/company/BatchControls";
import { CandidateTable, type CandidateRow } from "@/components/company/CandidateTable";
import { Badge, OrgPageHead, PANEL, type Tone } from "@/components/company/HiringParts";
import { LoadError, RoleOnly } from "@/components/company/OrgPanels";
import { requireCompany } from "@/lib/company/auth";
import { attemptsForBatch } from "@/lib/company/attempt-data";
import { reviewsForBatch } from "@/lib/company/review-data";
import { scoreText } from "@/lib/company/review-rules";
import { ATTEMPT_LABEL, attemptState, type AttemptState } from "@/lib/company/attempt-rules";
import { loadBatch, type Candidate } from "@/lib/company/batch-data";
import {
  DELIVERY_LABEL, MAIL_KIND_LABEL, MAIL_OUTCOME_LABEL, SENT_MEANS, PREP_COURSES, allowedMinutes, canRetry, canSchedule, deadlineText, durationText, formatInZone, lastStart, linkState,
  canScore, passedNote, reminderSummary, seesHiring, startPassed, toZonedInput, type Delivery, type LinkState,
} from "@/lib/company/batch-rules";
import { BATCH_STATE_LABEL, batchStateKey, candidateTags } from "@/lib/company/batch-view";
import { buildCandidateMail } from "@/lib/company/batch-send";
import { loadCompanyBrand } from "@/lib/company/invite";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "Hiring batch", robots: { index: false, follow: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const LINK: Record<LinkState, { label: string; tone: Tone }> = {
  draft: { label: "Not sent yet", tone: "grey" },
  batch_cancelled: { label: "Batch cancelled", tone: "grey" },
  cancelled: { label: "Cancelled", tone: "grey" },
  not_open: { label: "Opens later", tone: "grey" },
  open: { label: "Can start", tone: "green" },
  missed: { label: "Start passed", tone: "amber" },
};
const ATTEMPT_TONE: Record<AttemptState, Tone> = { in_progress: "blue", time_up: "amber", submitted: "green" };
const DELIVERY_TONE: Record<Delivery, Tone> = { pending: "grey", sending: "grey", sent: "blue", failed: "red", skipped: "amber" };

type Tab = "candidates" | "overview" | "invitation" | "emails";
const TAB_LABEL: Record<Tab, string> = { candidates: "Candidates", overview: "Overview", invitation: "Invitation", emails: "Emails" };

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[0.7rem] font-extrabold uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}

/**
 * One hiring batch, in tabs: Candidates (where each invitation stands and
 * what can be done about it), Overview (the test, window and rule),
 * Invitation (the email as the first person gets it) and Emails (every email
 * sent). A draft opens on its overview with the one button that sends it; a
 * sent batch opens on its candidates. Admins and company heads see it
 * without the buttons.
 */
export default async function BatchPage({ params, searchParams }: { params: Promise<{ slug: string; batch: string }>; searchParams: Promise<{ tab?: string | string[] }> }) {
  const { slug, batch: batchId } = await params;
  const member = await requireCompany(slug);
  const base = `/org/${member.companySlug}/hiring`;
  if (!seesHiring(member)) return <RoleOnly role="recruiters, reviewers and admins" home={`/org/${member.companySlug}`} />;
  if (!UUID.test(batchId)) notFound();

  const crumbs = [{ href: base, label: "Hiring batches" }];
  const sql = db();
  const found = sql ? await loadBatch(sql, member.companyId, batchId) : null;
  if (found === undefined) notFound();
  if (!found || !sql) return <><OrgPageHead crumbs={crumbs} title="Hiring batch" /><LoadError what="This batch" /></>;

  const { batch, candidates, mail } = found;
  const attempts = await attemptsForBatch(sql, member.companyId, batch.id);
  const attemptOf = new Map((attempts ?? []).map((a) => [a.candidateId, a]));
  const reviews = await reviewsForBatch(sql, member.companyId, batch.id);
  const reviewOf = new Map((reviews ?? []).map((r) => [r.attemptId, r]));
  const scorer = canScore(member);
  const recruiter = canSchedule(member);
  const now = new Date();
  const tz = batch.timeZone;
  const draft = batch.status === "draft";
  const live = batch.status === "sent" && recruiter;
  const active = candidates.filter((c) => c.status === "active");
  const lastOf = (c: Candidate) => lastStart({ closesAt: batch.closesAt, minutes: batch.minutes }, c);
  const passed = (c: Candidate) => startPassed({ closesAt: batch.closesAt, minutes: batch.minutes }, c, now);
  const stateOf = (c: Candidate) => linkState({ batchStatus: batch.status, candidateStatus: c.status, opensAt: batch.opensAt, lastStart: lastOf(c), now });
  const usualLast = lastStart({ closesAt: batch.closesAt, minutes: batch.minutes }, { extraMinutes: 0, lastStartAt: null });

  // Tabs: the one asked for, else where this batch's work is.
  const tabs: Tab[] = draft ? ["overview", "candidates", "invitation"] : ["candidates", "overview", "invitation", "emails"];
  const asked = (await searchParams).tab;
  const tab: Tab = typeof asked === "string" && (tabs as string[]).includes(asked) ? (asked as Tab) : tabs[0];
  const tabHref = (t: Tab) => (t === tabs[0] ? `${base}/${batch.id}` : `${base}/${batch.id}?tab=${t}`);

  const state = batchStateKey(batch, now);
  const sent = active.filter((c) => c.delivery === "sent").length;
  const failed = active.filter((c) => c.delivery === "failed" || c.delivery === "skipped").length;
  // Retrying sends the same link, so only to people who can still start.
  const retryable = active.filter((c) => (c.delivery === "failed" || c.delivery === "skipped") && !passed(c) && !attemptOf.has(c.id)).length;
  const unsentLate = batch.status === "sent" ? active.filter((c) => c.delivery !== "sent" && passed(c)).length : 0;
  // Someone who has started isn't reminded to start (the reminder queries skip them too).
  const remindable = batch.status === "sent" ? active.filter((c) => c.delivery === "sent" && now <= lastOf(c) && !attemptOf.has(c.id)).length : 0;

  const meta = (
    <>
      <span><Badge tone={state === "open" ? "blue" : state === "draft" ? "amber" : state === "cancelled" ? "red" : "grey"}>{BATCH_STATE_LABEL[state]}</Badge></span>
      <span>{batch.title} · version {batch.version}</span>
      <span>{durationText(batch.minutes)}</span>
      <span>{draft ? `${active.length} to invite` : `${active.length} invited · ${sent} sent${failed ? ` · ${failed} failed` : ""}`}</span>
      {batch.status === "sent" && <span>Sent by {batch.sentBy} · {formatInZone(batch.sentAt!, tz)}</span>}
      {batch.status === "cancelled" && <span>Cancelled by {batch.cancelledBy} · {formatInZone(batch.cancelledAt!, tz)}</span>}
    </>
  );

  const actions = draft
    ? recruiter
      ? <SendDraft slug={member.companySlug} batchId={batch.id} count={active.filter((c) => !passed(c)).length} passed={active.filter(passed).length} />
      : <p className="text-sm text-muted">A recruiter sends this batch.</p>
    : live
      ? <BatchButtons slug={member.companySlug} batchId={batch.id} failed={retryable} remindable={remindable} />
      : undefined;

  // ── Candidates ──
  const rows: CandidateRow[] = candidates.map((c) => {
    const link = stateOf(c);
    const history = mail.filter((m) => m.candidateId === c.id);
    const reminders = reminderSummary(history);
    const attempt = attemptOf.get(c.id);
    const scored = attempt ? reviewOf.get(attempt.id) : undefined;
    const where = attempt ? attemptState(attempt, now) : null;
    const isPassed = passed(c) && !attempt;
    const bad = c.status === "active" && (c.delivery === "failed" || c.delivery === "skipped");
    return {
      id: c.id,
      name: c.name,
      email: c.email,
      invitation: { label: DELIVERY_LABEL[c.delivery], tone: DELIVERY_TONE[c.delivery] },
      why: bad && c.deliveryError ? { lead: c.delivery === "skipped" ? "Why it wasn't sent" : "Why it failed", text: c.deliveryError } : null,
      link: where && link !== "cancelled" && link !== "batch_cancelled" ? { label: ATTEMPT_LABEL[where], tone: ATTEMPT_TONE[where] } : LINK[link],
      startBy: link === "cancelled" || link === "batch_cancelled"
        ? "—"
        : attempt?.submittedAt
          ? `Submitted ${formatInZone(attempt.submittedAt, tz)}${attempt.submitKind === "deadline" ? " · at the time limit" : ""}`
          : attempt
          ? `Started ${formatInZone(attempt.startedAt, tz)} · ends ${formatInZone(attempt.deadlineAt, tz)}`
          : formatInZone(lastOf(c), tz),
      // Once started, the time fixed at Start; a later change of extra minutes doesn't move a running clock.
      allowed: attempt
        ? `${durationText(attempt.allowedMinutes)} (fixed at start)`
        : `${durationText(allowedMinutes(batch.minutes, c.extraMinutes))}${c.extraMinutes ? ` (${c.extraMinutes} extra)` : ""}`,
      reminders: [
        ...(reminders.manual ? [`Reminded ${reminders.manual === 1 ? "once" : `${reminders.manual} times`}`] : []),
        ...(reminders.autoSent ? ["Automatic reminder sent"] : []),
      ],
      autoFailed: reminders.autoFailed && c.status === "active"
        ? `Automatic reminder ${reminders.autoFailed.outcome === "skipped" ? "not sent" : "failed"}${reminders.autoFailed.error ? `: ${reminders.autoFailed.error}` : ""}.${live && c.delivery === "sent" && !isPassed ? " Use Remind." : ""}`
        : null,
      tags: candidateTags({ active: c.status === "active" && batch.status !== "cancelled", delivery: c.delivery, link, started: !!attempt, submitted: !!attempt?.submittedAt, reviewed: !!scored }),
      review: attempt?.submittedAt
        ? scored
          ? { label: `Scored ${scoreText(scored.total, scored.max)}`, tone: "green", href: `${base}/${batch.id}/candidates/${c.id}`, action: scorer ? "Open or revise" : "Open" }
          : { label: "To review", tone: "amber", href: `${base}/${batch.id}/candidates/${c.id}`, action: scorer ? "Review" : "Open" }
        : null,
      // Once submitted there is nothing left to do about the invitation; what's next is the review.
      actions: live && c.status === "active" && !attempt?.submittedAt
        ? {
            // Once started their link is in use: no invitation to resend or readdress.
            retry: canRetry({ delivery: c.delivery, claimedAt: c.claimedAt }, now) && !isPassed && !attempt,
            fixEmail: bad && !isPassed && !attempt,
            remind: c.delivery === "sent" && now <= lastOf(c) && !attempt,
            newLink: !isPassed,
            passed: isPassed,
            extraMinutes: c.extraMinutes,
            lastStartInput: c.lastStartAt ? toZonedInput(c.lastStartAt, tz) : "",
          }
        : null,
    };
  });

  let body: React.ReactNode;
  if (tab === "candidates") {
    body = (
      <>
        {live && unsentLate > 0 && <p role="note" className="mb-4 rounded-md bg-[#fdf1e7] px-4 py-3 text-sm font-semibold text-[#6b3300]">{passedNote(unsentLate)}</p>}
        {draft && active.some(passed) && (
          <p role="note" className="mb-4 rounded-md bg-[#fdf1e7] px-4 py-3 text-sm font-semibold text-[#6b3300]">
            People marked &ldquo;Start passed&rdquo; won&apos;t be sent an invitation: their time to start has already gone.
          </p>
        )}
        <CandidateTable rows={rows} slug={member.companySlug} batchId={batch.id} timeZone={tz} />
      </>
    );
  } else if (tab === "overview") {
    body = (
      <section aria-label="Overview" className={PANEL}>
        <dl className="grid gap-x-8 gap-y-5 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <Fact label="Test">{batch.title} · version {batch.version}</Fact>
          <Fact label="Time allowed">{durationText(batch.minutes)} once they start</Fact>
          <Fact label="Reviewer">{batch.reviewer.name ?? batch.reviewer.email}</Fact>
          <Fact label="Opens">{deadlineText(batch.opensAt, tz)}</Fact>
          <Fact label="Closes">{deadlineText(batch.closesAt, tz)}</Fact>
          <Fact label="Last start">{deadlineText(usualLast, tz)}</Fact>
          <Fact label="Prep course">{batch.prepCourse ? `${PREP_COURSES[batch.prepCourse]}, open until closing` : "None"}</Fact>
          <Fact label="Time zone">{tz.replace(/_/g, " ")}</Fact>
          <Fact label="Made by">{batch.createdBy} · {formatInZone(batch.createdAt, tz)}</Fact>
        </dl>
        <p className="mx-5 mb-5 max-w-2xl rounded-md bg-paper px-4 py-3 text-sm">
          Everyone who starts by their last start gets their full time. Their last start is the closing time minus their time allowed, unless you gave them a later one. After it, their link won&apos;t start the test.
        </p>
      </section>
    );
  } else if (tab === "invitation") {
    const first = active[0];
    const brand = first ? await loadCompanyBrand(sql, batch.companyId) : null;
    const preview = first && brand ? buildCandidateMail("invite", batch, brand, first) : null;
    body = (
      <section aria-label="The invitation" className={`${PANEL} p-4 sm:p-5`}>
        {preview ? (
          <>
            <dl className="mb-4 grid gap-1 rounded-md border border-line/20 p-3 text-sm">
              <div><dt className="inline font-bold">From: </dt><dd className="inline">{preview.fromName}</dd></div>
              <div><dt className="inline font-bold">To: </dt><dd className="inline">{first.name} &lt;{first.email}&gt;</dd></div>
              <div><dt className="inline font-bold">Subject: </dt><dd className="inline">{preview.subject}</dd></div>
            </dl>
            <iframe title={`The invitation ${first.name} ${draft ? "will get" : "got"}`} srcDoc={preview.html} sandbox="" className="h-[720px] w-full rounded-md border border-line/20 bg-paper" />
          </>
        ) : (
          <p className="text-sm text-muted">
            {first ? "The preview can't be shown on this server (no AUTH_SECRET to sign links, or the company's details couldn't be read). Sending would fail the same way." : "Nobody in this batch is still invited."}
          </p>
        )}
        <p className="mt-3 text-xs text-muted">Each person gets their own private link and their own last start. This is {first?.name ?? "the first person"}&apos;s.</p>
      </section>
    );
  } else {
    const nameOf = new Map(candidates.map((c) => [c.id, c.name]));
    body = (
      <section aria-label="Emails" className={PANEL}>
        <p className="border-b border-line/20 px-4 py-3 text-xs text-muted">{SENT_MEANS}</p>
        {mail.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted">No emails yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line/20 text-left text-[0.7rem] uppercase tracking-[0.1em] text-muted">
                  <th scope="col" className="px-4 py-2.5 font-extrabold">When</th>
                  <th scope="col" className="px-4 py-2.5 font-extrabold">Person</th>
                  <th scope="col" className="px-4 py-2.5 font-extrabold">Email</th>
                  <th scope="col" className="px-4 py-2.5 font-extrabold">Result</th>
                  <th scope="col" className="px-4 py-2.5 font-extrabold">By</th>
                </tr>
              </thead>
              <tbody>
                {mail.map((m, i) => (
                  <tr key={i} className="border-b border-line/15 align-top last:border-b-0">
                    <td className="whitespace-nowrap px-4 py-2.5">{formatInZone(m.at, tz)}</td>
                    <td className="px-4 py-2.5">{nameOf.get(m.candidateId) ?? "—"}</td>
                    <td className="px-4 py-2.5">{MAIL_KIND_LABEL[m.kind]}{m.generation > 1 ? ` · link ${m.generation}` : ""}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={m.outcome === "sent" ? "blue" : m.outcome === "skipped" ? "amber" : "red"}>{MAIL_OUTCOME_LABEL[m.outcome]}</Badge>
                      {m.error && <p className="mt-1 max-w-xs text-xs text-error">{m.error}</p>}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted">{m.sentBy ?? "Automatic"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }

  return (
    <>
      <OrgPageHead crumbs={[...crumbs, { label: batch.role }]} title={batch.role} meta={meta} actions={actions} />
      <nav aria-label="Batch sections" className="mb-5 flex gap-1 overflow-x-auto border-b border-line/30">
        {tabs.map((t) => (
          <Link
            key={t}
            href={tabHref(t)}
            aria-current={t === tab ? "page" : undefined}
            className={clsx(
              "-mb-px whitespace-nowrap border-b-[3px] px-3 py-2.5 text-xs font-bold uppercase tracking-[0.08em]",
              t === tab ? "border-red-strong text-ink" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {TAB_LABEL[t]}
          </Link>
        ))}
      </nav>
      {body}
    </>
  );
}
