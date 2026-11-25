import clsx from "clsx";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CandidatePreview, Prose } from "@/components/company/AssessmentParts";
import { BTN_PRIMARY, OrgPageHead, PANEL } from "@/components/company/HiringParts";
import { OrgIcon } from "@/components/company/OrgIcons";
import { EmptyPanel, LoadError, RoleOnly } from "@/components/company/OrgPanels";
import { ReviewPanel } from "@/components/company/ReviewPanel";
import { InvitationRounds } from "@/components/company/InvitationRounds";
import { TestCandidates } from "@/components/company/TestCandidates";
import { loadTestRounds, type PersonFilter } from "@/lib/company/round-data";
import { companyReviews, loadVersions } from "@/lib/company/assessment-data";
import {
  RESULTS_LABEL, SUBMISSION_LABEL, candidateTask, canReview, canWriteTests, seesAssessments, standingOf, totalPoints, type Version,
} from "@/lib/company/assessment-rules";
import { requireCompany } from "@/lib/company/auth";
import { AUTO_REMIND_ATTEMPTS, AUTO_REMIND_HOURS, DEFAULT_TIME_ZONE, canSchedule, durationText, lastStart, seesHiring, toZonedInput } from "@/lib/company/batch-rules";
import { BasicSettingsForm, CandidateSettingsForm, EmailSettingsForm } from "@/components/company/TestSettingsForms";
import { loadTestSettings, reviewedPercents } from "@/lib/company/test-settings-data";
import { DETAIL_FIELDS, DETAIL_KEYS, cutoffResult, startBlocked, suggestCutoff } from "@/lib/company/test-settings";
import { saveBasicSettings, saveCandidateSettings, saveEmailSettings } from "../settings-actions";
import { companyCatalog } from "@/lib/company/catalog-data";
import { testCandidates, versionQuestionMarks, type HubCandidate } from "@/lib/company/test-hub-data";
import { SCORE_EDGES, funnel, histogram, percentOf, questionResults, timeEdges, type HubFacts } from "@/lib/company/test-hub-view";
import { db } from "@/lib/db/client";
import { InviteOverlay, OverlayLaunch } from "@/components/company/OverlayLaunch";
import { hiringOptions } from "@/lib/company/batch-data";
import { loadCompanyPeople } from "@/lib/company/people-data";
import { inviteDefaults, timeZoneList } from "@/lib/company/invite-defaults";


export const metadata: Metadata = { title: "Assessment", robots: { index: false, follow: false } };

type Tab = "overview" | "questions" | "settings" | "candidates" | "analysis";
const TAB_LABEL: Record<Tab, string> = { overview: "Overview", questions: "Questions", settings: "Settings", candidates: "Candidates", analysis: "Test analysis" };
type Setting = "basic" | "candidate" | "email";
const SETTING_LABEL: Record<Setting, string> = { basic: "Basic test setting", candidate: "Candidate settings", email: "Email and reports" };

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const CAPS = "text-xs font-semibold uppercase tracking-wide text-muted";
const BLUE_LINK = "inline-flex items-center gap-1.5 text-sm font-semibold text-[#1f4fd1] underline-offset-4 hover:underline";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}

/** A tab's body with a secondary menu on the left, as Settings and Test analysis are laid out. */
function Split({ title, items, children }: { title: string; items: { key: string; label: string; href: string; current: boolean }[]; children: React.ReactNode }) {
  return (
    <div className={clsx(PANEL, "flex flex-col lg:flex-row")}>
      <nav aria-label={title} className="border-b border-line/30 p-2 lg:w-60 lg:shrink-0 lg:border-r lg:border-b-0 lg:py-4">
        <p className="hidden px-3 pb-2 text-[0.7rem] font-extrabold uppercase tracking-[0.12em] text-muted lg:block">{title}</p>
        <ul className="flex gap-1 overflow-x-auto lg:flex-col">
          {items.map((it) => (
            <li key={it.key} className="shrink-0">
              <Link
                href={it.href}
                aria-current={it.current ? "page" : undefined}
                className={clsx("flex min-h-10 items-center whitespace-nowrap rounded-md px-3 text-sm", it.current ? "bg-[#eef2fd] font-semibold text-[#1f4fd1]" : "hover:bg-paper")}
              >
                {it.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="min-w-0 flex-1 p-5 sm:p-7">{children}</div>
    </div>
  );
}

/** Where one person stands, in the hub's words. */
function personFacts(c: HubCandidate, now: Date): HubFacts {
  const last = lastStart({ closesAt: c.closesAt, minutes: c.minutes }, { extraMinutes: c.extraMinutes, lastStartAt: c.lastStartAt });
  return {
    active: c.status === "active" && c.batchStatus === "sent",
    started: !!c.startedAt,
    submitted: !!c.submittedAt,
    reviewed: c.total !== null,
    passed: !c.startedAt && now > last,
    decision: c.submittedAt ? c.decision : null,
  };
}

/**
 * One test, laid out as a recruiter's test page: breadcrumb, title,
 * Preview and Invite candidates on the right, and tabs. Overview (what the
 * test holds, its approval and the instructions), Questions (the task and
 * how it's scored), Settings (what this version fixes), Candidates (everyone
 * invited to it across batches) and Test analysis (the funnel). Candidates
 * and analysis show only to people who see hiring.
 */
export default async function AssessmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; item: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug, item: itemSlug } = await params;
  const member = await requireCompany(slug);
  const company = `/org/${member.companySlug}`;
  const base = `${company}/assessments`;
  if (!seesAssessments(member)) return <RoleOnly role="recruiters, reviewers and admins" home={company} />;

  const sql = db();
  const catalog = sql ? await companyCatalog(sql, member.companyId) : null;
  if (!sql || !catalog) return <LoadError what="This test" />;
  const entry = catalog.find((e) => e.item.slug === itemSlug && e.item.kind === "assessment");
  if (!entry) notFound();
  const versions = await loadVersions(sql, itemSlug);
  const reviews = versions ? await companyReviews(sql, member.companyId, versions.map((v) => v.id)) : null;
  const crumbs = [{ href: base, label: "Assessments" }, { label: entry.item.title }];
  // The company's own test (U04a): its writers edit it here, and publishing is its approval.
  const own = !!entry.own;
  const editHref = own && canWriteTests(member) ? `${base}/${itemSlug}/edit` : null;
  const author = own ? member.companyName : "Klymb";
  if (!versions || !reviews) return <><OrgPageHead crumbs={crumbs} title={entry.item.title} /><LoadError what="This test" /></>;

  if (!versions.length) {
    return (
      <>
        <OrgPageHead crumbs={crumbs} title={entry.item.title} />
        {own ? (
          <EmptyPanel title="Not published yet" action={editHref ? <Link href={editHref} className={BTN_PRIMARY}>Write the test</Link> : undefined}>
            Your company is still writing this test. Once it&apos;s published, recruiters can invite people to it.
          </EmptyPanel>
        ) : (
          <EmptyPanel title="Not published yet">
            Klymb is still writing this test. You can see{" "}
            <Link href={`${company}/learning/courses/${itemSlug}`} className="font-bold underline underline-offset-2">what it covers</Link>.
          </EmptyPanel>
        )}
      </>
    );
  }

  const sp = await searchParams;
  const latest = versions[0];
  const asked = one(sp.v);
  const shown: Version | undefined = asked === undefined ? latest : versions.find((v) => v.version === Number(asked));
  if (!shown) notFound();
  const standing = standingOf(versions, reviews);
  const isLatest = shown.id === latest.id;
  const review = reviews.get(shown.id) ?? null;
  const seesPeople = seesHiring(member);
  const recruiter = canSchedule(member);

  const tabs: Tab[] = seesPeople ? ["overview", "questions", "settings", "candidates", "analysis"] : ["overview", "questions", "settings"];
  const askedTab = one(sp.tab);
  const preview = askedTab === "preview";
  const tab: Tab = tabs.includes(askedTab as Tab) ? (askedTab as Tab) : "overview";
  const keepV = asked === undefined ? "" : `v=${shown.version}`;
  const hrefFor = (t: Tab | "preview", extra = "") => {
    const q = [t === "overview" ? "" : `tab=${t}`, keepV, extra].filter(Boolean).join("&");
    return q ? `${base}/${itemSlug}?${q}` : `${base}/${itemSlug}`;
  };

  // This company's own settings for the test (U06a): access off or ended means no Invite.
  const settings = await loadTestSettings(sql, member.companyId, itemSlug);
  const blocked = settings ? startBlocked(settings) : null;
  // Invite inside the test (P0.2c): the round form in a drawer, this test chosen.
  const canInvite = recruiter && !!standing.inUse && !blocked;
  const [inviteOptions, invitePeople] = canInvite ? await Promise.all([hiringOptions(sql, member.companyId), loadCompanyPeople(sql, member.companyId)]) : [null, null];
  const inviteReady = !!inviteOptions && inviteOptions.tests.some((t) => t.item === itemSlug) && inviteOptions.reviewers.length > 0;
  const actions = (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {blocked && <Link href={hrefFor("settings")} className="text-sm font-semibold text-error underline-offset-4 hover:underline">{blocked === "closed" ? "Access is off" : "Test has ended"}</Link>}
      <OverlayLaunch label="Preview" icon="eye" className={BLUE_LINK} title={`Preview: ${shown.title}`} description={`Version ${shown.version}, as candidates see it before they start. Right answers and scoring guides are never shown to them.`} startOpen={one(sp.preview) === "1"}>
        <CandidatePreview t={candidateTask(shown)} />
      </OverlayLaunch>
      {editHref && <Link href={editHref} className={BLUE_LINK}><OrgIcon name="test" size={16} />Edit test</Link>}
      {canInvite && inviteOptions && inviteReady && (
        <InviteOverlay
          className={BTN_PRIMARY}
          startOpen={one(sp.invite) === "1"}
          form={{
            slug: member.companySlug, tests: inviteOptions.tests, reviewers: inviteOptions.reviewers, prepCourses: inviteOptions.prepCourses,
            timeZones: timeZoneList(), initial: { ...inviteDefaults(new Date()), test: itemSlug },
            company: invitePeople ? {
              people: invitePeople.active.map((p) => ({ email: p.email, name: p.name, teamId: p.team_id })),
              teams: invitePeople.teams.map((t) => ({ id: t.id, name: t.name, members: t.members })),
            } : undefined,
          }}
        />
      )}
      {canInvite && inviteOptions && !inviteOptions.reviewers.length && (
        <span className="text-sm text-muted">To invite people, give someone the reviewer role on People first.</span>
      )}
    </div>
  );
  const versionNote = !isLatest && (
    <p className="mb-4 text-sm font-semibold">
      You&apos;re looking at version {shown.version}, an older version. <Link href={`${base}/${itemSlug}${tab === "overview" ? "" : `?tab=${tab}`}`} className="underline underline-offset-4">See version {latest.version}</Link>
    </p>
  );

  const head = (
    <>
      <OrgPageHead crumbs={crumbs} title={shown.title} actions={actions} />
      <nav aria-label="Test sections" className="-mt-2 mb-6 flex gap-1 overflow-x-auto border-b border-line/40">
        {tabs.map((t) => {
          const current = !preview && t === tab;
          return (
            <Link
              key={t}
              href={hrefFor(t)}
              aria-current={current ? "page" : undefined}
              className={clsx("-mb-px whitespace-nowrap border-b-[3px] px-4 py-3 text-sm font-semibold uppercase tracking-wide", current ? "border-[#1f4fd1] text-[#1f4fd1]" : "border-transparent text-ink hover:text-[#1f4fd1]")}
            >
              {TAB_LABEL[t]}
            </Link>
          );
        })}
      </nav>
      {versionNote}
    </>
  );

  // ── Preview: exactly what a candidate will see ──
  if (preview) {
    return (
      <>
        {head}
        <p className="mb-4 text-sm text-muted">Preview of version {shown.version}, as candidates see it before they start. Scoring guides are never shown to them.</p>
        <div className={clsx(PANEL, "p-5 sm:p-8")}><CandidatePreview t={candidateTask(shown)} /></div>
      </>
    );
  }

  const points = totalPoints(shown.rubric);

  // ── Overview ──
  if (tab === "overview") {
    return (
      <>
        {head}
        <div className="flex flex-col gap-8">
          <div className={clsx(PANEL, "overflow-x-auto")}>
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className={CAPS}>
                <tr className="border-b border-line/30">
                  <th scope="col" className="px-5 py-3 font-semibold">Question type</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Hand in</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Questions</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Score</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-line/30">
                  <td className="px-5 py-4 font-semibold">Practical task <span className="font-normal text-muted">· {shown.rubric.length} scoring areas</span></td>
                  <td className="px-5 py-4">{SUBMISSION_LABEL[shown.submission]}</td>
                  <td className="px-5 py-4 tabular-nums">1</td>
                  <td className="px-5 py-4 tabular-nums">{points}</td>
                </tr>
                <tr className="bg-[#fdf8ec]">
                  <td className="px-5 py-4" colSpan={2}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#8a5a00]">Test duration</p>
                    <p className="mt-1">{durationText(shown.minutes)}</p>
                  </td>
                  <td className="px-5 py-4"><p className={CAPS}>Questions</p><p className="mt-1 text-base font-bold">1</p></td>
                  <td className="px-5 py-4"><p className={CAPS}>Score</p><p className="mt-1 text-base font-bold">{points}</p></td>
                </tr>
              </tbody>
            </table>
          </div>

          <section aria-labelledby="approval">
            <h2 id="approval" className="mb-3 text-lg font-bold">Approval</h2>
            {own ? (
              <p className="text-sm">Your company&apos;s own test: publishing a version approves it{review ? ` (version ${shown.version} by ${review.decidedBy} on ${day(review.decidedAt)})` : ""}.</p>
            ) : isLatest && canReview(member) ? (
              <ReviewPanel slug={member.companySlug} item={itemSlug} versionId={shown.id} version={shown.version} review={review} inUse={standing.inUse?.version ?? null} />
            ) : (
              <p className="text-sm">
                {review
                  ? `${review.decision === "approved" ? "Approved" : "Declined"} by ${review.decidedBy} on ${day(review.decidedAt)}.`
                  : isLatest
                    ? `Waiting for a reviewer in your company to approve it.${standing.inUse ? ` Until then, recruiters use version ${standing.inUse.version}.` : ""}`
                    : "No decision was made on this version."}
                {review?.note && <span className="mt-1 block text-muted">“{review.note}”</span>}
              </p>
            )}
          </section>

          <section aria-labelledby="instructions">
            <h2 id="instructions" className="text-lg font-bold">Test instructions</h2>
            <p className="mt-1 text-sm text-muted">Candidates read these before the test begins.</p>
            <div className={clsx(PANEL, "mt-3 p-5 sm:p-6")}>
              <ul className="mb-4 list-disc space-y-1.5 pl-5 text-sm">
                <li>This test contains <strong>1 practical task</strong>, scored in {shown.rubric.length} areas.</li>
                <li>The duration of this test is <strong>{durationText(shown.minutes)}</strong>. The time starts when they press Start, and can&apos;t be paused.</li>
                <li>The maximum score for the assessment is <strong>{points}</strong>.</li>
                <li>They have one attempt. Their work saves as they go, and what they saved is submitted for them when the time runs out.</li>
              </ul>
              <Prose text={shown.instructions} />
            </div>
          </section>
        </div>
      </>
    );
  }

  // ── Questions ──
  if (tab === "questions") {
    return (
      <>
        {head}
        <div className={clsx(PANEL, "mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-4")}>
          <h2 className="text-xl font-bold">Questions (1)</h2>
          <p className="text-sm text-muted">Total score: {points} | <OrgIcon name="clock" size={14} className="inline align-[-2px]" /> Total duration: {durationText(shown.minutes)}</p>
        </div>
        <p className={clsx(CAPS, "mb-3")}>Practical task (1) · total score {points}</p>
        <div className="flex flex-col gap-4">
          <article className={clsx(PANEL, "p-5")}>
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-base font-bold"><span className="mr-2 tabular-nums">01.</span>{shown.taskTitle}</h3>
              <span className="shrink-0 rounded-full border border-line/50 px-2.5 py-0.5 text-xs">Score: {points}</span>
            </div>
            <Prose text={shown.taskBrief} className="mt-3" />
            <p className="mt-3 text-xs text-muted">{SUBMISSION_LABEL[shown.submission]} · {shown.role}</p>
          </article>

          <article className={clsx(PANEL, "p-5")} aria-labelledby="rubric">
            <h3 id="rubric" className="text-base font-bold">Scoring rubric</h3>
            <p className="mt-1 text-xs text-muted">Scoring guides are for reviewers only. Candidates see the area names and points.</p>
            <ol className="mt-4 flex flex-col divide-y divide-line/20">
              {shown.rubric.map((c, i) => (
                <li key={c.title} className="flex gap-4 py-3">
                  <span className="w-6 shrink-0 tabular-nums text-muted">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-sm font-semibold">{c.title}</p>
                      <span className="rounded-full border border-line/50 px-2.5 py-0.5 text-xs">Score: {c.points}</span>
                    </div>
                    {c.skill && <span className="mt-1 inline-block rounded-full bg-paper px-2 py-0.5 text-xs">{c.skill}</span>}
                    <Prose text={c.guide} className="mt-2 text-muted" />
                  </div>
                </li>
              ))}
            </ol>
          </article>

          <article className={clsx(PANEL, "p-5")}>
            <h3 className="text-base font-bold">Practice task: {shown.sampleTitle}</h3>
            <Prose text={shown.sampleBrief} className="mt-2" />
            <p className="mt-2 text-xs text-muted">Shared before the test so people can prepare. It differs from the real task.</p>
          </article>
        </div>
      </>
    );
  }

  // ── Settings ──
  if (tab === "settings") {
    const s = (one(sp.s) as Setting) in SETTING_LABEL ? (one(sp.s) as Setting) : "basic";
    const items = (Object.keys(SETTING_LABEL) as Setting[]).map((k) => ({ key: k, label: SETTING_LABEL[k], href: hrefFor("settings", k === "basic" ? "" : `s=${k}`), current: k === s }));
    const percents = s === "candidate" && recruiter ? await reviewedPercents(sql, member.companyId, itemSlug) : [];
    if (!settings) return <>{head}<LoadError what="This test's settings" /></>;
    const remindEvery = `every ${AUTO_REMIND_HOURS} hours, at most ${AUTO_REMIND_ATTEMPTS} times, until their last start`;
    return (
      <>
        {head}
        <Split title="Settings" items={items}>
          {s === "basic" && (
            <>
              <h2 className="mb-4 font-bold">Access and tags</h2>
              {recruiter ? (
                <BasicSettingsForm
                  key={settings.revision}
                  save={saveBasicSettings.bind(null, member.companySlug, itemSlug)}
                  revision={settings.revision}
                  accessOpen={settings.accessOpen}
                  endsOnInput={settings.endsOn ? toZonedInput(settings.endsOn, DEFAULT_TIME_ZONE) : ""}
                  tags={settings.tags}
                  zoneLabel="India Standard Time"
                />
              ) : (
                <dl className="flex flex-col gap-5">
                  <Row label="Test access">{settings.accessOpen ? "On" : "Off: nobody can be invited or start"}</Row>
                  <Row label="Ends on">{settings.endsOn ? day(settings.endsOn) : "No end date"}</Row>
                  <Row label="Tags">{settings.tags.length ? settings.tags.join(", ") : "None"}</Row>
                </dl>
              )}
              <h2 className="mb-5 mt-10 border-t border-line/30 pt-6 font-bold">Other details</h2>
              <dl className="flex flex-col gap-5">
                <Row label="Test name">{shown.title}</Row>
                <Row label="Role">{shown.role}</Row>
                <Row label="Test type">Invite only: each candidate starts from their own link. There is no public link.</Row>
                <Row label="Assessment ID"><code className="rounded bg-paper px-1.5 py-0.5">{itemSlug}</code></Row>
                <Row label="Published">Version {shown.version}, by {own ? shown.publishedBy : author} on {day(shown.publishedAt)}</Row>
                <Row label="Versions">
                  <ol className="flex flex-col gap-1.5">
                    {versions.map((v) => {
                      const r = reviews.get(v.id);
                      return (
                        <li key={v.id}>
                          <Link href={`${base}/${itemSlug}?tab=settings&v=${v.version}`} aria-current={v.id === shown.id ? "page" : undefined} className="font-semibold underline-offset-4 hover:underline aria-[current=page]:underline">
                            Version {v.version}
                          </Link>
                          <span className="text-muted"> · {day(v.publishedAt)} · {r ? (r.decision === "approved" ? "Approved" : "Declined") : v.id === latest.id ? "Waiting for review" : "Not reviewed"}{standing.inUse?.id === v.id && " · in use"}</span>
                        </li>
                      );
                    })}
                  </ol>
                  <p className="mt-2 text-xs text-muted">A published version never changes. {author}&apos;s edits come as a new version, and rounds keep the version they started on.</p>
                </Row>
              </dl>
            </>
          )}
          {s === "candidate" && recruiter && (
            <div className="mb-8 border-b border-line/30 pb-8">
              <CandidateSettingsForm
                key={settings.revision}
                save={saveCandidateSettings.bind(null, member.companySlug, itemSlug)}
                revision={settings.revision}
                cutoffPercent={settings.cutoffPercent}
                collect={settings.collect}
                suggested={suggestCutoff(percents ?? [])}
                reviewed={(percents ?? []).length}
                fields={DETAIL_KEYS.map((k) => ({ key: k, label: DETAIL_FIELDS[k].label }))}
              />
            </div>
          )}
          {s === "candidate" && (
            <dl className="flex flex-col gap-6">
              <Row label="Time allowed">{durationText(shown.minutes)} from when they start. Extra time is set per person on a batch.</Row>
              <Row label="Hand in">{SUBMISSION_LABEL[shown.submission]}</Row>
              <Row label="Tools allowed">{shown.toolsAllowed.length ? <ul className="list-disc pl-5">{shown.toolsAllowed.map((t) => <li key={t}>{t}</li>)}</ul> : "Nothing listed"}</Row>
              <Row label="Tools not allowed">{shown.toolsNotAllowed.length ? <ul className="list-disc pl-5">{shown.toolsNotAllowed.map((t) => <li key={t}>{t}</li>)}</ul> : "Nothing listed"}</Row>
              {!recruiter && <Row label="Cut-off score">{settings.cutoffPercent === null ? "None" : `${settings.cutoffPercent}%`}</Row>}
              <Row label="Information collected from candidates">
                Full name and email, from the round&apos;s list{settings.collect.length ? `; before Start: ${settings.collect.map((k) => DETAIL_FIELDS[k].label.toLowerCase()).join(", ")}` : ""}.
              </Row>
            </dl>
          )}
          {s === "email" && (
            <dl className="flex flex-col gap-6">
              <Row label="Candidate result report">{RESULTS_LABEL[shown.results]}. A recruiter shares it after the review.</Row>
              {!recruiter && (
                <>
                  <Row label="Auto-reminder email">{settings.autoRemind ? `On: a reminder ${remindEvery}.` : "Off"}</Row>
                  <Row label="Invitation email">{settings.invite ? `Your company's own words: “${settings.invite.subject}”.` : "The standard invitation"}, in your company&apos;s branding.</Row>
                </>
              )}
            </dl>
          )}
          {s === "email" && recruiter && (
            <div className="mt-8 border-t border-line/30 pt-6">
              <EmailSettingsForm
                key={settings.revision}
                save={saveEmailSettings.bind(null, member.companySlug, itemSlug)}
                revision={settings.revision}
                autoRemind={settings.autoRemind}
                subject={settings.invite?.subject ?? ""}
                body={settings.invite?.body ?? ""}
                testName={shown.title}
                company={member.companyName}
                remindEvery={remindEvery}
              />
            </div>
          )}
        </Split>
      </>
    );
  }

  // ── Candidates and analysis: everyone invited, across batches ──
  const people = await testCandidates(sql, member.companyId, itemSlug);
  if (!people) return <>{head}<LoadError what="This test's candidates" /></>;
  const now = new Date();
  const facts = people.map((c) => ({ c, f: personFacts(c, now) }));

  if (tab === "candidates") {
    // Everyone, every round, with the actions the old batch pages had (U10). Rounds load fresh: no cached counts.
    const loaded = await loadTestRounds(sql, member, itemSlug, now);
    if (!loaded) return <>{head}<LoadError what="This test's candidates" /></>;
    const focus = one(sp.round) ?? null;
    const initial: PersonFilter = loaded.people.some((r) => r.tags.includes("taken")) ? "taken" : "invited";
    return (
      <>
        {head}
        <InvitationRounds sql={sql} member={member} rounds={loaded.rounds} focus={focus} />
        {loaded.people.length === 0 ? (
          <EmptyPanel title="Nobody invited yet" action={recruiter && standing.inUse ? <Link href={`${base}/${itemSlug}?tab=candidates&invite=1`} className="text-sm font-bold underline underline-offset-4">Invite candidates</Link> : undefined}>
            Candidates appear here once a round of invitations on this test is sent.
          </EmptyPanel>
        ) : (
          <TestCandidates rows={loaded.people} initial={initial} slug={member.companySlug} />
        )}
        <p className="mt-3 text-xs text-muted">A score doesn&apos;t shortlist or reject anyone; the recruiter decides.</p>
      </>
    );
  }

  // ── Test analysis ──
  const { steps, expired } = funnel(facts.map(({ c, f }) => ({ ...f, opened: c.opened })));
  const invited = steps[0].count;
  const started = steps[2].count;
  const submitted = steps[3].count;
  const scored = people.filter((c) => c.total !== null && c.max !== null && c.max > 0);
  const avg = scored.length ? Math.round((scored.reduce((n, c) => n + c.total! / c.max!, 0) / scored.length) * 100) : null;
  // Distributions (P0.6): reviewed scores, time taken, the cut-off, and each question of the version shown.
  const scoreBins = histogram(scored.map((c) => Math.min(99.9, (100 * c.total!) / c.max!)), SCORE_EDGES);
  const taken = people.filter((c) => c.startedAt && c.submittedAt).map((c) => (new Date(c.submittedAt!).getTime() - new Date(c.startedAt!).getTime()) / 60000);
  const timeBins = histogram(taken, timeEdges(shown.minutes));
  const cut = settings?.cutoffPercent ?? null;
  const cleared = cut === null ? null : scored.filter((c) => cutoffResult(c.total!, c.max!, cut) === "cleared").length;
  const awaiting = people.filter((c) => c.submittedAt && c.total === null).length;
  const marks = shown.questions?.length ? await versionQuestionMarks(sql, member.companyId, shown.id) : [];
  const perQuestion = shown.questions?.length && marks ? questionResults(marks, shown.questions.length) : [];
  return (
    <>
      {head}
      <Split title="Test analysis" items={[{ key: "analytics", label: "Test analytics", href: hrefFor("analysis"), current: true }]}>
        <section aria-labelledby="funnel">
          <h2 id="funnel" className="text-lg font-bold">Candidate hiring funnel</h2>
          <p className="mt-1 text-sm text-muted">
            {invited === 0 ? "Nobody has been invited to this test yet." : `${percentOf(started, invited)}% of the ${invited} invited candidates have started the test.`}
          </p>
          <ol className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line/30 bg-line/30 sm:grid-cols-3 lg:grid-cols-6">
            {steps.map((st, i) => (
              <li key={st.key} className="flex flex-col bg-white p-4">
                <p className="text-sm">{st.label}</p>
                <p className="mt-1 text-3xl font-semibold tabular-nums">{st.count}</p>
                <div aria-hidden="true" className="mt-4 h-2 rounded-full bg-paper">
                  <div className="h-2 rounded-full bg-[#3aa7d6]" style={{ width: `${invited ? Math.round((st.count / invited) * 100) : 0}%` }} />
                </div>
                {i > 0 && st.ofPrevious !== null && (
                  <p className="mt-3 text-xs text-muted">{st.ofPrevious}% of {steps[i - 1].label.toLowerCase()}</p>
                )}
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-muted">
            Counted from what Klymb records (a link opened, a Start, a submission, a completed review, a recruiter&apos;s decision), never from email opens.
            {expired > 0 && ` ${expired} ${expired === 1 ? "person's" : "people's"} start time passed without starting.`} Cancelled invitations nobody started aren&apos;t counted.
          </p>
        </section>

        <section aria-labelledby="metrics" className="mt-10">
          <h2 id="metrics" className="text-lg font-bold">Test performance metrics</h2>
          <dl className="mt-4 grid gap-6 sm:grid-cols-3">
            <div><dt className="text-sm text-muted">Invited candidates who submitted</dt><dd className="mt-1 text-2xl font-semibold">{invited ? `${percentOf(submitted, invited)}%` : "—"}<span className="ml-2 text-sm font-normal text-muted">{submitted} of {invited}</span></dd></div>
            <div><dt className="text-sm text-muted">Started candidates who submitted</dt><dd className="mt-1 text-2xl font-semibold">{started ? `${percentOf(submitted, started)}%` : "—"}<span className="ml-2 text-sm font-normal text-muted">{submitted} of {started}</span></dd></div>
            <div><dt className="text-sm text-muted">Average reviewed score</dt><dd className="mt-1 text-2xl font-semibold">{avg === null ? "—" : `${avg}%`}<span className="ml-2 text-sm font-normal text-muted">{scored.length} reviewed</span></dd></div>
            <div><dt className="text-sm text-muted">Cleared the cut-off</dt><dd className="mt-1 text-2xl font-semibold">{cleared === null ? "—" : cleared}<span className="ml-2 text-sm font-normal text-muted">{cut === null ? "no cut-off set" : `of ${scored.length} reviewed · cut-off ${cut}%`}</span></dd></div>
            <div><dt className="text-sm text-muted">Submitted, waiting for review</dt><dd className="mt-1 text-2xl font-semibold">{awaiting}<span className="ml-2 text-sm font-normal text-muted">multiple choice already auto-marked</span></dd></div>
          </dl>
        </section>

        <section aria-labelledby="dists" className="mt-10 grid gap-8 lg:grid-cols-2">
          <h2 id="dists" className="sr-only">Distributions</h2>
          <Bars title="Reviewed scores" note={`${scored.length} reviewed candidates, by percent of the total. Confirmed reviews only.`} bins={scoreBins.map((b) => ({ label: `${b.from}${b.to === null ? "–100" : `–${b.to - 1}`}%`, count: b.count }))} />
          <Bars title="Time taken" note={`${taken.length} submissions, minutes from Start to submission (${durationText(shown.minutes)} allowed).`} bins={timeBins.map((b) => ({ label: b.to === null ? `${b.from}+ min` : `${b.from}–${b.to} min`, count: b.count }))} />
        </section>

        {perQuestion.length > 0 && (
          <section aria-labelledby="per-question" className="mt-10">
            <h2 id="per-question" className="text-lg font-bold">Questions in version {shown.version}</h2>
            <p className="mt-1 text-sm text-muted">Automatic marks for multiple choice at submission (an unanswered question is marked 0), before any reviewer change. Written questions are scored in reviews.</p>
            <table className="mt-4 w-full text-left text-sm">
              <thead className={CAPS}><tr className="border-b border-line/30"><th className="py-2 pr-3">#</th><th className="py-2 pr-3">Question</th><th className="py-2 pr-3">Marked</th><th className="py-2 pr-3">Full marks</th><th className="py-2">Average</th></tr></thead>
              <tbody>
                {perQuestion.map((r) => {
                  const q = shown.questions![r.questionNo - 1];
                  return (
                    <tr key={r.questionNo} className="border-b border-line/20 align-top">
                      <td className="py-2 pr-3 tabular-nums">{r.questionNo}</td>
                      <td className="py-2 pr-3">{q.title}{!q.mcq && <span className="text-muted"> · written</span>}</td>
                      <td className="py-2 pr-3 tabular-nums">{q.mcq ? r.attempts : "—"}</td>
                      <td className="py-2 pr-3 tabular-nums">{q.mcq && r.attempts ? `${r.full} (${percentOf(r.full, r.attempts)}%)` : "—"}</td>
                      <td className="py-2">
                        {q.mcq && r.average !== null ? (
                          <span className="flex items-center gap-2"><span className="h-2 w-24 overflow-hidden rounded-full bg-line/20"><span className="block h-full bg-[#3aa7d6]" style={{ width: `${r.average}%` }} /></span><span className="tabular-nums">{r.average}%</span></span>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}
      </Split>
    </>
  );
}

/** A simple bar chart of counts per bucket. */
function Bars({ title, note, bins }: { title: string; note: string; bins: { label: string; count: number }[] }) {
  const top = Math.max(1, ...bins.map((b) => b.count));
  return (
    <div>
      <h3 className="text-base font-bold">{title}</h3>
      <ol className="mt-3 space-y-1.5" aria-label={title}>
        {bins.map((b) => (
          <li key={b.label} className="grid grid-cols-[6.5rem_minmax(0,1fr)_2rem] items-center gap-2 text-xs">
            <span className="text-muted">{b.label}</span>
            <span className="h-3 overflow-hidden rounded bg-paper"><span className="block h-full rounded bg-[#3aa7d6]" style={{ width: `${(100 * b.count) / top}%` }} /></span>
            <span className="text-right tabular-nums">{b.count}</span>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-xs text-muted">{note}</p>
    </div>
  );
}
