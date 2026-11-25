import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CandidateNotice, CandidateShell } from "@/components/company/CandidateShell";
import { Countdown } from "@/components/company/Countdown";
import { AttemptWork } from "@/components/company/AttemptWork";
import { QuestionsWork } from "@/components/company/QuestionsWork";
import { ProctorChips, ProctorGuard } from "@/components/company/ProctorGuard";
import { loadTestSettings } from "@/lib/company/test-settings-data";
import { attemptByLink, attemptTask, listAttemptFiles, loadAnswers, loadDraft } from "@/lib/company/attempt-data";
import { attemptState } from "@/lib/company/attempt-rules";
import { readCandidateLink } from "@/lib/company/batch-link";
import { candidateByLink } from "@/lib/company/batch-data";
import { deadlineText } from "@/lib/company/batch-rules";
import { readableBrandColor } from "@/lib/company/brand";
import { loadCompanyBrand } from "@/lib/company/invite";
import { db } from "@/lib/db/client";
import { MAIL_SUPPORT } from "@/lib/mail";

export const metadata: Metadata = { title: "Your test", robots: { index: false, follow: false }, referrer: "no-referrer" };

/**
 * The running test. Opens only through the person's current link, while
 * they are still invited and have started; anything else goes back to the
 * link's own page, which says why. The task comes from the version pinned
 * to the attempt, and the countdown from the deadline the server set at
 * Start: reloading, reconnecting or opening it on another device shows the
 * same time left. The answer saves as they write, files attach as they're
 * chosen, and Submit freezes both (AttemptWork).
 */
export default async function AttemptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const home = `/assessment/${token}`;
  const ref = readCandidateLink(token);
  const sql = db();
  if (!ref || !sql) redirect(home);
  const found = await candidateByLink(sql, ref.id);
  if (!found || found.candidate.generation !== ref.generation || found.candidate.status !== "active" || found.batch.status !== "sent") redirect(home);
  const attempt = await attemptByLink(sql, ref.id, ref.generation);
  if (attempt === null) {
    return <CandidateShell brand={null}><CandidateNotice title="This page can't load right now">Reload in a minute. Your time keeps running.</CandidateNotice></CandidateShell>;
  }
  if (!attempt) redirect(home);

  const now = new Date();
  if (attemptState(attempt, now) !== "in_progress") redirect(home);

  const [task, brandRow, draft, files, answers, settings] = await Promise.all([
    attemptTask(sql, attempt.id), loadCompanyBrand(sql, found.batch.companyId), loadDraft(sql, attempt.id), listAttemptFiles(sql, attempt.id), loadAnswers(sql, attempt.id),
    loadTestSettings(sql, found.batch.companyId, found.batch.item),
  ]);
  // The company's proctoring for this test (0070), read fresh on every load.
  const proctor = settings?.proctor ?? { fullscreen: false, tabs: false, copy: false, webcam: false, limit: null };
  const brand = brandRow ? { name: brandRow.name, logoUrl: brandRow.logoUrl, accent: readableBrandColor(brandRow.brandColor) } : null;
  const support = brandRow?.supportEmail ?? MAIL_SUPPORT;
  const tz = found.batch.timeZone;

  return (
    <CandidateShell brand={brand} wide>
      <ProctorGuard token={token} attemptId={attempt.id} config={proctor} home={home}>
      <div className="sticky top-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b border-line/30 bg-paper/95 px-4 py-3 shadow-[0_1px_0_rgba(0,0,0,0.02)] backdrop-blur sm:-mx-6 sm:px-6">
        <div className="min-w-0">
          <p className="truncate text-base font-bold">{found.batch.title}</p>
          <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <span>Ends {deadlineText(attempt.deadlineAt, tz)} · answers save as you go</span>
            <ProctorChips config={proctor} />
          </p>
        </div>
        <Countdown deadline={attempt.deadlineAt} serverNow={now.toISOString()} />
      </div>

      {task?.questions ? (
        answers === null || files === null ? (
          <section role="alert" className="card p-6 text-sm">Your saved work can&apos;t be loaded right now. Reload the page in a moment; your time keeps running and nothing saved is lost.</section>
        ) : (
          <>
            <h1 className="sr-only">{found.batch.title}</h1>
            <QuestionsWork
              token={token}
              attemptId={attempt.id}
              questions={task.questions}
              answers={Object.fromEntries([...answers].map(([no, a]) => [no, { revision: a.revision, answer: a.answer, picked: a.picked, savedAt: new Date(a.savedAt).toISOString() }]))}
              files={Object.fromEntries(task.questions.map((q) => [q.no, files.filter((f) => f.questionNo === q.no).map((f) => ({ id: f.id, name: f.name, bytes: f.bytes }))]))}
              deadline={new Date(attempt.deadlineAt).toISOString()}
              serverNow={now.toISOString()}
              timeZone={tz}
            />
          </>
        )
      ) : (
      <>
      <section aria-labelledby="task" className="card p-6">
        <h1 id="task" className="display text-2xl">{task?.taskTitle ?? "Your task"}</h1>
        <div className="mt-4 whitespace-pre-line text-sm leading-relaxed">{task?.taskBrief ?? "The task can't be shown right now. Reload the page; your time keeps running."}</div>
      </section>

      {draft === null || (task?.submission === "written_file" && files === null) ? (
        <section role="alert" className="card p-6 text-sm">Your saved work can&apos;t be loaded right now. Reload the page in a moment; your time keeps running and nothing saved is lost.</section>
      ) : (
        <AttemptWork
          token={token}
          attemptId={attempt.id}
          withFiles={task?.submission === "written_file"}
          initialAnswer={draft?.answer ?? ""}
          initialRevision={draft?.revision ?? 0}
          initialSavedAt={draft?.savedAt ? new Date(draft.savedAt).toISOString() : null}
          initialFiles={(files ?? []).map((f) => ({ id: f.id, name: f.name, bytes: f.bytes }))}
          deadline={new Date(attempt.deadlineAt).toISOString()}
          serverNow={now.toISOString()}
          timeZone={tz}
        />
      )}
      </>
      )}

      <p className="text-xs text-muted">
        Problems during the test? Write to <a href={`mailto:${support}`} className="font-bold underline underline-offset-4">{support}</a>.{" "}
        {!proctor.fullscreen && <Link href={home} className="underline underline-offset-4">Back to the test&apos;s page</Link>}
      </p>
      </ProctorGuard>
    </CandidateShell>
  );
}
