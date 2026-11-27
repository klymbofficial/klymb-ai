import clsx from "clsx";
import { BatchButtons, SendDraft } from "@/components/company/BatchControls";
import { Badge, PANEL, type Tone } from "@/components/company/HiringParts";
import type { CompanyMember } from "@/lib/company/access";
import { buildCandidateMail } from "@/lib/company/batch-send";
import { loadTestSettings } from "@/lib/company/test-settings-data";
import {
  MAIL_KIND_LABEL, MAIL_OUTCOME_LABEL, PREP_COURSES, PURPOSE_LABEL, SENT_MEANS, canSchedule, deadlineText, durationText, formatInZone, lastStart, passedNote,
} from "@/lib/company/batch-rules";
import { BATCH_STATE_LABEL, type BatchStateKey } from "@/lib/company/batch-view";
import { loadCompanyBrand } from "@/lib/company/invite";
import type { Round } from "@/lib/company/round-data";
import type { Db } from "@/lib/db/client";

const STATE_TONE: Record<BatchStateKey, Tone> = { open: "blue", later: "grey", draft: "amber", closed: "grey", cancelled: "red" };
const summary = "cursor-pointer text-sm font-semibold text-[#1f4fd1]";

/**
 * Each invitation group on this test: its window, reviewer and counts, and
 * its own actions — send or discard a
 * draft, retry failed invitations, remind, cancel — with the invitation as
 * the first person gets it and every email sent. A draft (or the round just
 * made) opens expanded. Recruiters act; everyone else reads.
 */
export async function InvitationRounds({ sql, member, rounds, focus }: { sql: Db; member: CompanyMember; rounds: Round[]; focus: string | null }) {
  if (!rounds.length) return null;
  const recruiter = canSchedule(member);
  const [brand, settings] = await Promise.all([loadCompanyBrand(sql, member.companyId), loadTestSettings(sql, member.companyId, rounds[0].batch.item)]);
  const template = settings?.invite ?? null;
  const draftCount = recruiter ? rounds.filter((r) => r.batch.status === "draft").length : 0;
  const needs = recruiter ? rounds.reduce((n, r) => n + (r.batch.status === "sent" ? r.retryable : 0), 0) : 0;
  return (
    <details open={rounds.some((r) => r.batch.status === "draft") || (focus !== null && rounds.some((r) => r.batch.id === focus))} className={clsx(PANEL, "group mb-6")}>
      <summary className="flex cursor-pointer flex-wrap items-baseline justify-between gap-2 px-5 py-3">
        <span className="text-base font-bold">
          Invitations ({rounds.length})
          {draftCount > 0 && <span className="ml-2"><Badge tone="amber">{draftCount === 1 ? "1 draft to send" : `${draftCount} drafts to send`}</Badge></span>}
          {needs > 0 && <span className="ml-2"><Badge tone="red">{needs === 1 ? "1 failed invitation" : `${needs} failed invitations`}</Badge></span>}
        </span>
        <span className="text-xs text-muted">Open a group to send, retry, remind or cancel invitations.</span>
      </summary>
      <ol className="divide-y divide-line/20 border-t border-line/30">
        {rounds.map((r) => {
          const b = r.batch;
          const tz = b.timeZone;
          const draft = b.status === "draft";
          const live = b.status === "sent" && recruiter;
          const first = r.candidates.find((c) => c.status === "active");
          const preview = first && brand ? buildCandidateMail("invite", b, brand, first, new Date(), template) : null;
          const expanded = draft || focus === b.id;
          const nameOf = new Map(r.candidates.map((c) => [c.id, c.name]));
          return (
            <li key={b.id} id={`round-${b.id}`} aria-label={`Invitations: ${b.role}`} className={clsx("px-5 py-4", focus === b.id && "bg-[#f6f8fe]")}>
              <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">{b.role}</span>
                    <Badge tone={STATE_TONE[r.state]}>{BATCH_STATE_LABEL[r.state]}</Badge>
                    <Badge tone={b.purpose === "internal" ? "blue" : "grey"}>{PURPOSE_LABEL[b.purpose]}</Badge>
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    Opens {deadlineText(b.opensAt, tz)} · closes {deadlineText(b.closesAt, tz)} · last start{" "}
                    {deadlineText(lastStart({ closesAt: b.closesAt, minutes: b.minutes }, { extraMinutes: 0, lastStartAt: null }), tz)}
                  </p>
                  <p className="mt-1 text-sm">
                    {draft
                      ? `${r.active} to invite`
                      : `${r.active} invited · ${r.sent} sent${r.failed ? ` · ${r.failed} failed` : ""}`}
                    <span className="text-muted"> · version {b.version} · {durationText(b.minutes)} · reviewer {b.reviewer.name ?? b.reviewer.email}
                      {b.prepCourse ? ` · prep: ${PREP_COURSES[b.prepCourse]}` : ""}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    Made by {b.createdBy} · {formatInZone(b.createdAt, tz)}
                    {b.status === "sent" && ` · sent by ${b.sentBy} · ${formatInZone(b.sentAt!, tz)}`}
                    {b.status === "cancelled" && ` · cancelled by ${b.cancelledBy} · ${formatInZone(b.cancelledAt!, tz)}`}
                  </p>
                </div>
                {draft && recruiter && <SendDraft slug={member.companySlug} batchId={b.id} count={r.sendable} passed={r.passed} />}
                {live && <BatchButtons slug={member.companySlug} batchId={b.id} failed={r.retryable} remindable={r.remindable} />}
              </div>

              {live && r.unsentLate > 0 && <p role="note" className="mt-3 rounded-md bg-[#fdf1e7] px-3 py-2 text-sm font-semibold text-[#6b3300]">{passedNote(r.unsentLate)}</p>}
              {draft && (
                <details open className="mt-3">
                  <summary className={summary}>People in this draft ({r.active})</summary>
                  <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                    {r.candidates.filter((c) => c.status === "active").map((c) => {
                      const late = new Date() > lastStart({ closesAt: b.closesAt, minutes: b.minutes }, c);
                      return (
                        <li key={c.id} className="min-w-0 truncate">
                          {c.name} <span className="text-muted">· {c.email}{c.extraMinutes ? ` · +${c.extraMinutes} min` : ""}</span>
                          {late && <strong className="text-[#6b3300]"> · start passed, won&apos;t be sent</strong>}
                        </li>
                      );
                    })}
                  </ul>
                </details>
              )}

              <details open={expanded && draft} className="mt-3">
                <summary className={summary}>{draft ? "The invitation they will get" : "The invitation"}</summary>
                {preview ? (
                  <div className="mt-3">
                    <dl className="mb-3 grid gap-1 rounded-md border border-line/20 p-3 text-sm">
                      <div><dt className="inline font-bold">From: </dt><dd className="inline">{preview.fromName}</dd></div>
                      <div><dt className="inline font-bold">To: </dt><dd className="inline">{first!.name} &lt;{first!.email}&gt;</dd></div>
                      <div><dt className="inline font-bold">Subject: </dt><dd className="inline">{preview.subject}</dd></div>
                    </dl>
                    <iframe title={`The invitation ${first!.name} ${draft ? "will get" : "got"}`} srcDoc={preview.html} sandbox="" className="h-[640px] w-full rounded-md border border-line/20 bg-paper" />
                    <p className="mt-2 text-xs text-muted">Each person gets their own private link and their own last start. This is {first!.name}&apos;s.</p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted">
                    {first ? "The preview can't be shown on this server (no AUTH_SECRET to sign links, or the company's details couldn't be read). Sending would fail the same way." : "Nobody in this group is still invited."}
                  </p>
                )}
              </details>

              {!draft && (
                <details open={focus === b.id && r.mail.length > 0} className="mt-2">
                  <summary className={summary}>Emails ({r.mail.length})</summary>
                  <p className="mt-2 text-xs text-muted">{SENT_MEANS}</p>
                  {r.mail.length > 0 && (
                    <div className="mt-2 overflow-x-auto rounded-md border border-line/20">
                      <table className="w-full min-w-[40rem] text-sm">
                        <thead className="bg-paper text-left text-xs text-muted">
                          <tr>
                            <th scope="col" className="px-3 py-2 font-semibold">When</th>
                            <th scope="col" className="px-3 py-2 font-semibold">Person</th>
                            <th scope="col" className="px-3 py-2 font-semibold">Email</th>
                            <th scope="col" className="px-3 py-2 font-semibold">Result</th>
                            <th scope="col" className="px-3 py-2 font-semibold">By</th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.mail.map((m, i) => (
                            <tr key={i} className="border-t border-line/15 align-top">
                              <td className="whitespace-nowrap px-3 py-2">{formatInZone(m.at, tz)}</td>
                              <td className="px-3 py-2">{nameOf.get(m.candidateId) ?? "—"}</td>
                              <td className="px-3 py-2">{MAIL_KIND_LABEL[m.kind]}{m.generation > 1 ? ` · link ${m.generation}` : ""}</td>
                              <td className="px-3 py-2">
                                <Badge tone={m.outcome === "sent" ? "blue" : m.outcome === "skipped" ? "amber" : "red"}>{MAIL_OUTCOME_LABEL[m.outcome]}</Badge>
                                {m.error && <p className="mt-1 max-w-xs text-xs text-error">{m.error}</p>}
                              </td>
                              <td className="px-3 py-2 text-xs text-muted">{m.sentBy ?? "Automatic"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </details>
              )}
            </li>
          );
        })}
      </ol>
    </details>
  );
}
