import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge, OrgPageHead, PANEL } from "@/components/company/HiringParts";
import { LoadError, RoleOnly } from "@/components/company/OrgPanels";
import { DecisionForm, ShareForm } from "@/components/company/DecisionPanel";
import { ReviewForm } from "@/components/company/ReviewForm";
import { requireCompany } from "@/lib/company/auth";
import { sizeText } from "@/lib/company/attempt-files";
import { ATTEMPT_LABEL, attemptState } from "@/lib/company/attempt-rules";
import { canDecide, canScore, durationText, formatInZone, seesHiring } from "@/lib/company/batch-rules";
import { decisionHistory } from "@/lib/company/decision-data";
import { loadReviewView, type ReviewRecord } from "@/lib/company/review-data";
import { roundOfCandidate } from "@/lib/company/round-data";
import { DECISION_LABEL, scoreText, type HiringDecision } from "@/lib/company/review-rules";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "Review", robots: { index: false, follow: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DECISION_TONE: Record<HiringDecision, "green" | "red" | "amber"> = { shortlisted: "green", not_shortlisted: "red", on_hold: "amber" };
const RESULTS_SEEN = {
  none: "This test's settings don't show candidates a result, so there's nothing to share.",
  overall: "They'll see their total score (for example 15 / 20) on their test link. Never notes, the summary or the scoring guides.",
  by_area: "They'll see their total and each area's points on their test link. Never notes, the summary or the scoring guides.",
} as const;
const label = "text-[0.7rem] font-extrabold uppercase tracking-[0.12em] text-muted";

function Fact({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className={label}>{name}</dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}

/**
 * One candidate's submission and its review. Left: what they submitted,
 * frozen (the answer, and files through an authorised download), and when
 * and how. Right: the rubric pinned to their attempt, with each criterion's
 * guide; a reviewer scores it here, anyone else who sees the batch reads the
 * latest review. Every completed review is kept as a version.
 */
export default async function ReviewPage({ params }: { params: Promise<{ slug: string; item: string; candidate: string }> }) {
  const { slug, item, candidate: candidateId } = await params;
  const member = await requireCompany(slug);
  const home = `/org/${member.companySlug}`;
  if (!seesHiring(member)) return <RoleOnly role="recruiters, reviewers and admins" home={home} />;
  if (!UUID.test(candidateId)) notFound();
  const sql = db();
  // The round comes from the database, scoped to this company and test.
  const batchId = sql ? await roundOfCandidate(sql, member.companyId, item, candidateId) : null;
  if (batchId === undefined) notFound();
  const testHref = `${home}/assessments/${item}`;
  const view = sql && batchId ? await loadReviewView(sql, member.companyId, batchId, candidateId) : null;
  if (view === undefined) notFound();
  if (!view) return <><OrgPageHead crumbs={[{ href: `${home}/assessments`, label: "Assessments" }]} title="Review" /><LoadError what="This submission" /></>;

  const { candidate: c, batch: b, attempt: a, submission: s, rubric, reviews, questions } = view;
  const tz = b.timeZone;
  const latest = reviews[0] ?? null;
  const scorer = canScore(member);
  const where = a ? attemptState(a, new Date()) : null;
  const history = a && s ? await decisionHistory(sql!, member.companyId, a.id) : { decisions: [], shares: [] };
  const decider = canDecide(member);
  const internal = view.batch.purpose === "internal";
  const decision = history?.decisions[0] ?? null;
  const share = history?.shares[0] ?? null;

  return (
    <>
      <OrgPageHead
        crumbs={[{ href: `${home}/assessments`, label: "Assessments" }, { href: `${testHref}?tab=candidates`, label: b.title }, { href: `${testHref}?tab=candidates&round=${b.id}#round-${b.id}`, label: b.role }]}
        title={c.name}
        meta={
          <>
            <span>{c.email}</span>
            <span><Badge tone={where === "submitted" ? "green" : where === "in_progress" ? "blue" : where ? "amber" : "grey"}>{where ? ATTEMPT_LABEL[where] : ATTEMPT_LABEL.none}</Badge></span>
            {s && <span><Badge tone={latest ? "green" : "amber"}>{latest ? `Scored ${scoreText(latest.total, latest.max)}` : "To review"}</Badge></span>}
            {decision && <span><Badge tone={DECISION_TONE[decision.decision]}>{DECISION_LABEL[decision.decision]}</Badge></span>}
            {c.status === "cancelled" && <span><Badge tone="grey">Invitation cancelled</Badge></span>}
            <span>{b.title} · version {b.version}</span>
            {b.purpose === "internal" && <span><Badge tone="blue">Internal</Badge></span>}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start">
        <section aria-labelledby="submission" className={`${PANEL} min-w-0`}>
          <div className="border-b border-line/20 px-5 py-3"><h2 id="submission" className="text-base font-bold">Submission</h2></div>
          {!a ? (
            <p className="p-5 text-sm text-muted">{c.name} hasn&apos;t started the test.</p>
          ) : !s ? (
            <p className="p-5 text-sm text-muted">
              {where === "in_progress"
                ? `In progress: started ${formatInZone(a.startedAt, tz)}, ends ${formatInZone(a.deadlineAt, tz)}. Their work shows here once it's submitted.`
                : "Their time is up; what they saved is being submitted. Reload in a minute."}
            </p>
          ) : (
            <div className="space-y-5 p-5">
              <dl className="grid gap-4 sm:grid-cols-3">
                <Fact name="Submitted">
                  {formatInZone(a.submittedAt!, tz)}
                  <span className="block text-xs text-muted">{a.submitKind === "deadline" ? "Automatically at the time limit" : "By the candidate"}</span>
                </Fact>
                <Fact name="Started">{formatInZone(a.startedAt, tz)}<span className="block text-xs text-muted">{durationText(a.allowedMinutes)} allowed</span></Fact>
                <Fact name="Receipt"><span className="font-mono">{a.receipt}</span></Fact>
              </dl>
              {questions ? (
                <ol className="space-y-5">
                  {questions.map((q, i) => {
                    const ans = s.answers?.find((x) => x.questionNo === i + 1);
                    return (
                      <li key={i} className="border-t border-line/20 pt-4 first:border-t-0 first:pt-0">
                        {q.section && q.section !== questions[i - 1]?.section && <p className="mb-1 text-xs font-bold text-muted">{q.section}</p>}
                        <h3 className="text-sm font-bold">{i + 1}. {q.title}</h3>
                        {q.mcq ? (
                          ans?.picked.length ? (
                            <ul className="mt-2 space-y-1 text-sm">
                              {ans.picked.map((p) => {
                                const o = q.mcq!.options[p];
                                return <li key={p}>{String.fromCharCode(65 + p)}. {o?.text ?? "(option removed)"} <span className={o?.correct ? "font-bold text-[#14532d]" : "font-bold text-error"}>{o?.correct ? "· correct" : "· wrong"}</span></li>;
                              })}
                              {q.mcq.options.some((o, k) => o.correct && !ans.picked.includes(k)) && (
                                <li className="text-xs text-muted">Missed: {q.mcq.options.flatMap((o, k) => (o.correct && !ans.picked.includes(k) ? [String.fromCharCode(65 + k)] : [])).join(", ")}</li>
                              )}
                            </ul>
                          ) : (
                            <p className="mt-2 text-sm text-muted">No option chosen.</p>
                          )
                        ) : ans?.answer.trim() ? (
                          <div className="mt-2 max-h-[50vh] overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-line/30 bg-paper p-4 text-sm leading-relaxed">{ans.answer}</div>
                        ) : (
                          <p className="mt-2 text-sm text-muted">No written answer was saved.</p>
                        )}
                        {ans && ans.files.length > 0 && (
                          <ul className="mt-2 divide-y divide-line/20 rounded-md border border-line/30">
                            {ans.files.map((f) => (
                              <li key={f.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                                <span className="min-w-0 truncate" title={f.name}>{f.name} <span className="text-muted">· {f.kind.toUpperCase()} · {sizeText(f.bytes)}</span></span>
                                <a href={`${testHref}/candidates/${c.id}/files/${f.id}`} className="shrink-0 text-xs font-bold underline underline-offset-4">Download</a>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ol>
              ) : (
              <>
              <div>
                <h3 className={label}>Written answer</h3>
                {s.answer.trim() ? (
                  <div className="mt-2 max-h-[70vh] overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-line/30 bg-paper p-4 text-sm leading-relaxed">{s.answer}</div>
                ) : (
                  <p className="mt-2 text-sm text-muted">No written answer was saved.</p>
                )}
              </div>
              <div>
                <h3 className={label}>Files</h3>
                {s.files.length ? (
                  <ul className="mt-2 divide-y divide-line/20 rounded-md border border-line/30">
                    {s.files.map((f) => (
                      <li key={f.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                        <span className="min-w-0 truncate" title={f.name}>{f.name} <span className="text-muted">· {f.kind.toUpperCase()} · {sizeText(f.bytes)}</span></span>
                        <a href={`${testHref}/candidates/${c.id}/files/${f.id}`} className="shrink-0 text-xs font-bold underline underline-offset-4">Download</a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-muted">No files attached.</p>
                )}
              </div>
              </>
              )}
            </div>
          )}
        </section>

        <section aria-labelledby="score" className={`${PANEL} min-w-0`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line/20 px-5 py-3">
            <h2 id="score" className="text-base font-bold">Score</h2>
            <p className="text-xs text-muted">Assigned reviewer: {b.reviewerName ?? b.reviewerEmail}</p>
          </div>
          <div className="p-5">
            {questions ? (
              <p className="text-sm text-muted">
                This test has {questions.length} questions. Scoring each question, with multiple choice marked automatically, comes in the next step;
                the answers are on the left.
              </p>
            ) : s && scorer ? (
              <ReviewForm
                key={latest?.revision ?? 0}
                slug={member.companySlug}
                batchId={b.id}
                candidateId={c.id}
                rubric={rubric}
                baseRevision={latest?.revision ?? 0}
                initial={{
                  points: rubric.map((_, i) => latest?.scores[i]?.points ?? null),
                  notes: rubric.map((_, i) => latest?.scores[i]?.note ?? ""),
                  summary: latest?.summary ?? "",
                }}
              />
            ) : latest ? (
              <ReviewRead review={latest} tz={tz} />
            ) : (
              <>
                <p className="text-sm text-muted">{s ? "Not reviewed yet. A reviewer scores it here." : "Scoring opens once the test is submitted."}</p>
                <ul className="mt-4 space-y-2 text-sm">
                  {rubric.map((r, i) => <li key={i}><span className="font-semibold">{r.title}</span> <span className="text-muted">· {r.skill} · up to {r.points}</span></li>)}
                </ul>
              </>
            )}
          </div>
          {reviews.length > 0 && (
            <div className="border-t border-line/20 px-5 py-4">
              <h3 className={label}>History</h3>
              <ol className="mt-2 space-y-2">
                {reviews.map((r) => (
                  <li key={r.revision}>
                    <details className="text-sm">
                      <summary className="cursor-pointer">
                        Version {r.revision} · <strong>{scoreText(r.total, r.max)}</strong> · {r.reviewerName ?? r.reviewerEmail} · {formatInZone(r.completedAt, tz)}
                        {r.revision === latest?.revision && <span className="text-muted"> (counts)</span>}
                      </summary>
                      <div className="mt-2 pl-4"><ReviewRead review={r} tz={tz} compact /></div>
                    </details>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>
      </div>

      {s && (
        <section aria-labelledby="decision" className={`${PANEL} mt-6`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line/20 px-5 py-3">
            <h2 id="decision" className="text-base font-bold">{internal ? "Result" : "Hiring decision"}</h2>
            <p className="text-xs text-muted">{internal ? "An internal round: colleagues are scored and reviewed, never shortlisted." : "Recruiters and company heads decide. A score never decides on its own."}</p>
          </div>
          {!history ? (
            <p className="p-5 text-sm text-error">Decisions can&apos;t be loaded right now. Reload in a minute.</p>
          ) : (
            <div className="grid gap-6 p-5 lg:grid-cols-2">
              {internal ? (
                <p className="min-w-0 text-sm text-muted">No hiring decision for internal rounds. Share the result with them on the right, if this test&apos;s settings allow it.</p>
              ) : (
              <div className="min-w-0">
                <p className="mb-4 text-sm">
                  {decision
                    ? <>Now: <Badge tone={DECISION_TONE[decision.decision]}>{DECISION_LABEL[decision.decision]}</Badge> <span className="text-muted">· {decision.deciderName ?? decision.decidedBy} · {formatInZone(decision.decidedAt, tz)}</span></>
                    : <span className="text-muted">No decision yet.</span>}
                </p>
                {decider ? (
                  <DecisionForm key={decision?.revision ?? 0} ids={{ slug: member.companySlug, batchId: b.id, candidateId: c.id }} baseRevision={decision?.revision ?? 0} current={decision?.decision ?? null} reviewed={!!latest} />
                ) : (
                  <p className="text-sm text-muted">{scorer ? "Reviewers score; a recruiter or company head records the decision." : "You can see decisions; a recruiter or company head records them."}</p>
                )}
                {history.decisions.length > 0 && (
                  <div className="mt-5 border-t border-line/20 pt-4">
                    <h3 className={label}>Decision history</h3>
                    <ol className="mt-2 space-y-2 text-sm">
                      {history.decisions.map((d) => (
                        <li key={d.revision}>
                          <strong>{DECISION_LABEL[d.decision]}</strong> <span className="text-muted">· {d.deciderName ?? d.decidedBy} · {formatInZone(d.decidedAt, tz)} · {d.reviewRevision ? `after review version ${d.reviewRevision}` : "before any review"}{d.revision === decision?.revision && " (counts)"}</span>
                          <p className="mt-0.5 whitespace-pre-line text-muted">{d.reason}</p>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
              )}

              <div className="min-w-0 lg:border-l lg:border-line/20 lg:pl-6">
                <h3 className="text-sm font-bold">Result for the candidate</h3>
                <p className="mt-1 text-sm text-muted">{RESULTS_SEEN[view.results]}</p>
                <p className="mt-3 text-sm">
                  {share
                    ? <>Shared review version {share.reviewRevision} ({share.policy === "by_area" ? "by area" : "total only"}) · {share.sharerName ?? share.sharedBy} · {formatInZone(share.sharedAt, tz)}</>
                    : "Not shared."}
                  {share && latest && latest.revision > share.reviewRevision && (
                    <strong className="mt-1 block text-[#6b3300]">Score changed since it was shared (now version {latest.revision}). The candidate still sees version {share.reviewRevision} until you share again.</strong>
                  )}
                </p>
                {decider && view.results !== "none" && (
                  <div className="mt-3">
                    <ShareForm
                      ids={{ slug: member.companySlug, batchId: b.id, candidateId: c.id }}
                      disabled={!latest || (!!share && share.reviewRevision === latest.revision)}
                      label={!latest ? "Share result (after a review)" : share ? (share.reviewRevision === latest.revision ? "Shared" : "Share the new score") : "Share result"}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}
    </>
  );
}

function ReviewRead({ review, tz, compact = false }: { review: ReviewRecord; tz: string; compact?: boolean }) {
  return (
    <div className="space-y-3 text-sm">
      {!compact && <p><span className="font-bold">{scoreText(review.total, review.max)}</span> <span className="text-muted">· {review.reviewerName ?? review.reviewerEmail} · {formatInZone(review.completedAt, tz)}</span></p>}
      <ul className="space-y-2">
        {review.scores.map((s, i) => (
          <li key={i}>
            <span className="font-semibold">{s.title}</span> <span className="text-muted">· {s.points} / {s.max}</span>
            {s.note && <p className="mt-0.5 whitespace-pre-line text-muted">{s.note}</p>}
          </li>
        ))}
      </ul>
      {review.summary && <p className="whitespace-pre-line border-l-4 border-line/40 pl-3">{review.summary}</p>}
    </div>
  );
}
