import type { Metadata } from "next";
import Link from "next/link";
import { CandidateNotice, CandidateShell } from "@/components/company/CandidateShell";
import { LocalTime } from "@/components/company/LocalTime";
import { StartTest } from "@/components/company/StartTest";
import { RefreshAt } from "@/components/company/RefreshAt";
import { attemptByLink, loadSubmission, recordLinkOpened, type Submission } from "@/lib/company/attempt-data";
import { sharedResultFor } from "@/lib/company/decision-data";
import type { SharedResult } from "@/lib/company/review-rules";
import { attemptState, SAVE_GRACE_SECONDS } from "@/lib/company/attempt-rules";
import { sizeText } from "@/lib/company/attempt-files";
import { readCandidateLink } from "@/lib/company/batch-link";
import { candidateByLink, type CandidateView } from "@/lib/company/batch-data";
import { allowedMinutes, deadlineText, durationText, lastStart, linkState } from "@/lib/company/batch-rules";
import { readableBrandColor } from "@/lib/company/brand";
import { loadCompanyBrand } from "@/lib/company/invite";
import { db } from "@/lib/db/client";
import { MAIL_SUPPORT } from "@/lib/mail";

// The link is the key: never indexed, never sent on as a referrer.
export const metadata: Metadata = { title: "Your assessment", robots: { index: false, follow: false }, referrer: "no-referrer" };

const RESULTS_LINE = {
  none: "The company doesn't share scores with candidates.",
  overall: "If the company shares your result, you'll see your overall score here after it has been reviewed.",
  by_area: "If the company shares your result, you'll see your score for each area here after it has been reviewed.",
} as const;

const label = "text-xs font-extrabold uppercase tracking-[0.14em] text-muted";

/**
 * A candidate's private link. Before they start: their test, when they can
 * start, how long they have, the instructions and rules, in the company's
 * look, and a Start button. Once started: a way back into the running test.
 * Once submitted (by them, or at the time limit): their receipt. Or why the
 * link no longer works. The test's task is shown only after
 * Start.
 */
export default async function CandidatePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ref = readCandidateLink(token);
  const sql = db();
  const found: CandidateView | undefined | null = ref && sql ? await candidateByLink(sql, ref.id) : undefined;
  const brandRow = found && sql ? await loadCompanyBrand(sql, found.batch.companyId) : null;
  const brand = brandRow ? { name: brandRow.name, logoUrl: brandRow.logoUrl, accent: readableBrandColor(brandRow.brandColor) } : null;
  const support = brandRow?.supportEmail ?? MAIL_SUPPORT;
  const write = <a href={`mailto:${support}`} className="font-bold underline underline-offset-4">{support}</a>;

  if (found === null) {
    return <CandidateShell brand={null}><CandidateNotice title="This page can't load right now">Try again in a minute. If it keeps happening, write to {write}.</CandidateNotice></CandidateShell>;
  }
  if (!ref || !found || found.batch.status === "draft") {
    return <CandidateShell brand={null}><CandidateNotice title="This link doesn't work">Check that you opened the whole link from your email. If it still doesn&apos;t work, write to the company that invited you, or to {write}.</CandidateNotice></CandidateShell>;
  }

  const { candidate: c, batch: b, version: v } = found;
  const company = brand?.name ?? "The company";
  if (ref.generation !== c.generation) {
    return <CandidateShell brand={brand}><CandidateNotice title="This link has been replaced">{company} sent you a newer link. Use the one in their latest email. If you had started, your test continues from there. Questions? Write to {write}.</CandidateNotice></CandidateShell>;
  }

  const now = new Date();
  const last = lastStart({ closesAt: b.closesAt, minutes: b.minutes }, c);
  const state = linkState({ batchStatus: b.status, candidateStatus: c.status, opensAt: b.opensAt, lastStart: last, now });
  if (state === "cancelled" || state === "batch_cancelled") {
    return <CandidateShell brand={brand}><CandidateNotice title="This invitation was cancelled">{company} cancelled this invitation, so the test can&apos;t be started or continued from this link. Questions? Write to {write}.</CandidateNotice></CandidateShell>;
  }

  // The first open of this link, for the company's reports. A failure here never stops the page.
  await recordLinkOpened(sql!, c.id, c.generation);
  const attempt = await attemptByLink(sql!, c.id, c.generation);
  if (attempt === null) {
    return <CandidateShell brand={brand}><CandidateNotice title="This page can't load right now">Try again in a minute. If it keeps happening, write to {write}.</CandidateNotice></CandidateShell>;
  }

  if (attempt?.submittedAt) {
    const [sub, result] = await Promise.all([loadSubmission(sql!, attempt.id), sharedResultFor(sql!, attempt.id)]);
    return (
      <CandidateShell brand={brand}>
        <Receipt
          company={company}
          role={b.role}
          title={b.title}
          receipt={attempt.receipt}
          submittedAt={attempt.submittedAt}
          kind={attempt.submitKind ?? "candidate"}
          zone={b.timeZone}
          submission={sub ?? null}
          withFiles={v.submission === "written_file"}
        />
        {result && <ResultCard company={company} result={result} zone={b.timeZone} />}
        <p className="text-xs text-muted">This link is for {c.email} only. Questions? Write to {write} and quote your receipt code.</p>
      </CandidateShell>
    );
  }

  if (attempt) {
    const where = attemptState(attempt, now);
    return (
      <CandidateShell brand={brand}>
        <section className="card p-6">
          <p className={label}>{b.role} · {company}</p>
          {where === "in_progress" ? (
            <>
              <h1 className="display mt-2 text-3xl">Your test is in progress</h1>
              <p className="mt-2 text-sm">You started at {deadlineText(attempt.startedAt, b.timeZone)}. Your time ends at {deadlineText(attempt.deadlineAt, b.timeZone)}<LocalTime iso={attempt.deadlineAt} zone={b.timeZone} />.</p>
              <Link href={`/assessment/${token}/attempt`} className="mt-6 inline-flex min-h-11 items-center rounded-md border-2 border-red-strong bg-red-strong px-6 font-bold text-white hover:bg-red-press">
                Continue the test
              </Link>
            </>
          ) : (
            <>
              <h1 className="display mt-2 text-3xl">Your time is up</h1>
              <p className="mt-2 text-sm">Your time ended at {deadlineText(attempt.deadlineAt, b.timeZone)}. What you saved is being submitted for you; this page shows your receipt in under a minute.</p>
              <RefreshAt at={new Date(new Date(attempt.deadlineAt).getTime() + (SAVE_GRACE_SECONDS + 3) * 1000).toISOString()} serverNow={now.toISOString()} />
            </>
          )}
        </section>
        <p className="text-xs text-muted">This link is for {c.email} only. Questions? Write to {write}.</p>
      </CandidateShell>
    );
  }

  const allowed = durationText(allowedMinutes(b.minutes, c.extraMinutes));
  const heading = state === "missed" ? "The time to start has passed" : state === "not_open" ? "Your assessment opens soon" : "Your assessment is open";

  return (
    <CandidateShell brand={brand}>
      <section className="card p-6">
        <p className={label}>{b.role} · {company}</p>
        <h1 className="display mt-2 text-3xl">{heading}</h1>
        <p className="mt-2 text-sm">Hi {c.name}. This is {company}&apos;s assessment: <strong>{b.title}</strong>.</p>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          {state === "not_open" && (
            <div>
              <dt className={label}>Opens</dt>
              <dd className="mt-1 text-sm">{deadlineText(b.opensAt, b.timeZone)}<LocalTime iso={b.opensAt} zone={b.timeZone} /></dd>
            </div>
          )}
          <div>
            <dt className={label}>Start by</dt>
            <dd className="mt-1 text-sm">{deadlineText(last, b.timeZone)}<LocalTime iso={last.toISOString()} zone={b.timeZone} /></dd>
          </div>
          <div>
            <dt className={label}>Time allowed</dt>
            <dd className="mt-1 text-sm">{allowed} once you start. The clock keeps running if you close the page.</dd>
          </div>
        </dl>

        {state === "missed" ? (
          <p className="mt-6 border-l-4 border-error bg-error-tint px-4 py-3 text-sm font-semibold">
            The last moment to start was {deadlineText(last, b.timeZone)}. If you think you should have more time, write to {write}.
          </p>
        ) : state === "not_open" ? (
          <p className="mt-6 border-l-4 border-ink bg-white px-4 py-3 text-sm">Come back to this link when it opens. Start by the time above to get your full {allowed}.</p>
        ) : (
          <StartTest token={token} allowed={allowed} />
        )}
      </section>

      {state !== "missed" && (
        <section className="card p-6 text-sm">
          <h2 className="display text-lg">Before you start</h2>
          <p className="mt-3 whitespace-pre-line leading-relaxed">{v.instructions}</p>
          {v.toolsAllowed.length > 0 && <p className="mt-3"><strong>You may use:</strong> {v.toolsAllowed.join(", ")}.</p>}
          {v.toolsNotAllowed.length > 0 && <p className="mt-2"><strong>Don&apos;t use:</strong> {v.toolsNotAllowed.join(", ")}.</p>}
          <p className="mt-2">You&apos;ll write your answer{v.submission === "written_file" ? " and can attach files" : ""}. The task appears when you start.</p>
          <p className="mt-2 text-muted">{RESULTS_LINE[v.results]}</p>
        </section>
      )}

      <p className="text-xs text-muted">This link is for {c.email} only. Questions about the assessment? Write to {write}.</p>
    </CandidateShell>
  );
}

const words = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);

/** The candidate's receipt: a code to quote, when and how it was submitted, and what was received. Never the answer itself. */
function Receipt({ company, role, title, receipt, submittedAt, kind, zone, submission, withFiles }: {
  company: string;
  role: string;
  title: string;
  receipt: string;
  submittedAt: string;
  kind: "candidate" | "deadline";
  zone: string;
  submission: Submission | null;
  withFiles: boolean;
}) {
  const n = submission ? words(submission.answer) : 0;
  return (
    <section className="card p-6" aria-labelledby="receipt-title">
      <p className={label}>{role} · {company}</p>
      <h1 id="receipt-title" className="display mt-2 text-3xl">{kind === "deadline" ? "Your time ran out, and your work was submitted" : "Your test is submitted"}</h1>
      <p className="mt-2 text-sm">{company} has your answer for <strong>{title}</strong>. They&apos;ll be in touch.</p>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className={label}>Receipt</dt>
          <dd className="mt-1 font-mono text-2xl font-bold tracking-widest">{receipt}</dd>
        </div>
        <div>
          <dt className={label}>Submitted</dt>
          <dd className="mt-1 text-sm">
            {deadlineText(submittedAt, zone)}<LocalTime iso={submittedAt} zone={zone} />
            <span className="block text-muted">{kind === "deadline" ? "Automatically at the time limit, with what you had saved" : "By you"}</span>
          </dd>
        </div>
      </dl>

      <div className="mt-6 border-t border-line/30 pt-4">
        <h2 className={label}>Received</h2>
        {submission ? (
          <ul className="mt-2 space-y-1 text-sm">
            <li>{n ? `Written answer · ${n.toLocaleString("en")} ${n === 1 ? "word" : "words"}` : "No written answer was saved"}</li>
            {submission.files.map((f, i) => <li key={i} className="break-all">{f.name} <span className="text-muted">· {sizeText(f.bytes)}</span></li>)}
            {withFiles && submission.files.length === 0 && <li className="text-muted">No files attached</li>}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">The details can&apos;t be shown right now; your submission is safe.</p>
        )}
      </div>
    </section>
  );
}

/**
 * The result the company shared: the total, and each area's points when the
 * test's policy shows them. Only ever what a recruiter pressed Share on;
 * never notes, the summary, the scoring guides or a hiring decision.
 */
function ResultCard({ company, result, zone }: { company: string; result: SharedResult; zone: string }) {
  return (
    <section className="card p-6" aria-labelledby="result-title">
      <p className={label}>Your result</p>
      <h2 id="result-title" className="display mt-2 text-2xl">{result.total} / {result.max}</h2>
      <p className="mt-1 text-sm text-muted">Shared by {company} on {deadlineText(result.sharedAt, zone)}.</p>
      {result.areas && (
        <ul className="mt-4 divide-y divide-line/20 border-t border-line/20 text-sm">
          {result.areas.map((a, i) => (
            <li key={i} className="flex justify-between gap-4 py-2">
              <span>{a.title}</span>
              <span className="shrink-0 tabular-nums">{a.points} / {a.max}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
