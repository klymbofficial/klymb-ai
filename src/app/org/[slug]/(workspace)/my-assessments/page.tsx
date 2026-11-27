import type { Metadata } from "next";
import { Badge, BTN_PRIMARY, BTN_SECONDARY, OrgPageHead, PANEL, type Tone } from "@/components/company/HiringParts";
import { OrgIcon } from "@/components/company/OrgIcons";
import { EmptyPanel, LoadError } from "@/components/company/OrgPanels";
import { attemptState } from "@/lib/company/attempt-rules";
import { requireCompany } from "@/lib/company/auth";
import { allowedMinutes, deadlineText, durationText, lastStart, linkState } from "@/lib/company/batch-rules";
import { myInvitations, type MyInvitation } from "@/lib/company/my-assessments";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "My assessments", robots: { index: false, follow: false } };

interface Where {
  label: string;
  tone: Tone;
  line: string;
  /** The button, or null when there's nothing to open. */
  action: { label: string; primary: boolean } | null;
}

/** Where one of my tests stands and what I can do, in the words the candidate pages use. */
function whereOf(t: MyInvitation, now: Date): Where {
  const tz = t.timeZone;
  if (t.submittedAt) {
    return t.shared
      ? { label: "Result shared", tone: "green", line: `Submitted ${deadlineText(t.submittedAt, tz)}`, action: { label: "View result", primary: false } }
      : { label: "Submitted", tone: "green", line: `Submitted ${deadlineText(t.submittedAt, tz)}`, action: { label: "View receipt", primary: false } };
  }
  if (t.startedAt && t.deadlineAt) {
    const state = attemptState({ startedAt: t.startedAt, deadlineAt: t.deadlineAt, submittedAt: null }, now);
    return state === "in_progress"
      ? { label: "In progress", tone: "blue", line: `Ends ${deadlineText(t.deadlineAt, tz)}`, action: { label: "Continue", primary: true } }
      : { label: "Time up", tone: "amber", line: "What you saved is being submitted.", action: { label: "View", primary: false } };
  }
  const last = lastStart({ closesAt: t.closesAt, minutes: t.minutes }, { extraMinutes: t.extraMinutes, lastStartAt: t.lastStartAt });
  const link = linkState({ batchStatus: t.batchStatus, candidateStatus: t.status, opensAt: t.opensAt, lastStart: last, now });
  if (link === "cancelled" || link === "batch_cancelled") return { label: "Cancelled", tone: "grey", line: "This invitation was cancelled.", action: null };
  if (link === "not_open") return { label: "Opens later", tone: "grey", line: `Opens ${deadlineText(t.opensAt, tz)} · start by ${deadlineText(last, tz)}`, action: { label: "Details", primary: false } };
  if (link === "missed") return { label: "Start passed", tone: "amber", line: `The last start was ${deadlineText(last, tz)}.`, action: null };
  return { label: "Can start", tone: "blue", line: `Start by ${deadlineText(last, tz)}`, action: { label: "Start", primary: true } };
}

/**
 * The tests sent to me in this company, matched by my work email (U11).
 * Each opens my own private test page, the same one my invitation email
 * links to: the same clock, autosave, submit, receipt and shared result.
 */
export default async function MyAssessmentsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const member = await requireCompany(slug);
  const head = <OrgPageHead title="My assessments" meta="Tests your company sent to your work email. The same tests your invitation emails link to." />;
  const sql = db();
  const mine = sql ? await myInvitations(sql, member.companyId, member.email) : null;
  if (!mine) return <>{head}<LoadError what="Your assessments" /></>;
  if (!mine.length) {
    return <>{head}<EmptyPanel title="Nothing sent to you yet">When your company sends you a test, it shows here and in your email.</EmptyPanel></>;
  }
  const now = new Date();
  return (
    <>
      {head}
      <ul className="flex flex-col gap-4">
        {mine.map((t) => {
          const w = whereOf(t, now);
          return (
            <li key={t.id} className={`${PANEL} flex flex-col gap-3 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between`}>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="text-lg font-bold">{t.title}</span>
                  <Badge tone={w.tone}>{w.label}</Badge>
                  {t.purpose === "internal" && <Badge tone="grey">Internal</Badge>}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                  <span>{t.role}</span>
                  <span className="inline-flex items-center gap-1.5"><OrgIcon name="clock" size={15} />{durationText(allowedMinutes(t.minutes, t.extraMinutes))}</span>
                </p>
                <p className="mt-1 text-sm">{w.line}</p>
              </div>
              {w.action && (
                <a href={`/org/${member.companySlug}/my-assessments/open/${t.id}`} className={`${w.action.primary ? BTN_PRIMARY : BTN_SECONDARY} shrink-0`}>
                  {w.action.label}
                </a>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-xs text-muted">Once you start, the clock keeps running even if you close the page. Your company sees your submission and review; you see a result only if they share it.</p>
    </>
  );
}
