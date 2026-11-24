/**
 * Practical assessments' rules: what a draft holds, what a Klymb admin may
 * save, what stops a publish, what a candidate is shown, and where each
 * company stands on each version. Pure, so it can be tested; the database
 * side is src/lib/company/assessment-data.ts (migration 0051).
 *
 * A Klymb admin edits one draft per assessment and publishes it as a
 * numbered version that never changes. A company reviewer approves or
 * declines each version for their company. Recruiters pick the newest
 * approved version; a newer one waits for its own approval.
 */
import type { CatalogAssessment } from "@/data/business-catalog";
import { hasRole, type CompanyMember, type CompanyRole } from "@/lib/company/access";

/**
 * Who opens a company's tests, real task included: the people who hire and
 * whoever runs the workspace. A team lead and an employee don't: the task is
 * kept from anyone who might later take it or pass it on.
 */
export const ASSESSMENT_ROLES = ["admin", "company_head", "recruiter", "reviewer"] as const satisfies readonly CompanyRole[];
export const seesAssessments = (member: CompanyMember | null): boolean => hasRole(member, ASSESSMENT_ROLES);
/** Who writes and publishes the company's own tests (U04a): the people who hire and whoever runs the workspace. */
export const TEST_WRITERS = ["admin", "company_head", "recruiter"] as const satisfies readonly CompanyRole[];
export const canWriteTests = (member: CompanyMember | null): boolean => hasRole(member, TEST_WRITERS);
/** Only a reviewer approves or declines a version for their company. */
export const canReview = (member: CompanyMember | null): boolean => hasRole(member, ["reviewer"]);

export const SUBMISSIONS = ["written", "written_file"] as const;
export type Submission = (typeof SUBMISSIONS)[number];
export const SUBMISSION_LABEL: Record<Submission, string> = {
  written: "A written answer",
  written_file: "A written answer, and up to 3 files (PDF, PNG, JPG, TXT or MD, 4 MB each)",
};

export const RESULTS = ["none", "overall", "by_area"] as const;
export type ResultVisibility = (typeof RESULTS)[number];
/** What candidates see afterwards, for the people setting the test. */
export const RESULTS_LABEL: Record<ResultVisibility, string> = {
  none: "A receipt only, no result",
  overall: "Their overall result, after review",
  by_area: "Their result in each rubric area, after review",
};
/** The same, said to the candidate. */
export const RESULTS_FOR_CANDIDATE: Record<ResultVisibility, string> = {
  none: "You'll get a receipt when your work arrives. Results aren't shared.",
  overall: "You'll see your overall result once it's reviewed.",
  by_area: "You'll see your result in each area once it's reviewed.",
};

export const DECISIONS = ["approved", "declined"] as const;
export type Decision = (typeof DECISIONS)[number];

export const LIMITS = {
  role: 120,
  minutesMin: 5,
  minutesMax: 480,
  tools: 12,
  tool: 160,
  instructions: 3000,
  title: 160,
  brief: 6000,
  sampleBrief: 3000,
  criteria: 10,
  criterionTitle: 120,
  skill: 60,
  pointsMax: 10,
  guide: 1000,
  note: 1000,
} as const;

/** A company test's name (catalog_items.title allows 1 to 120). */
export const TEST_NAME_MAX = 120;

/** The name of a company's own test: one line, required. */
export function readTestName(raw: unknown): Result<string> {
  const name = line(raw);
  if (!name) return { ok: false, message: "Give the test a name." };
  if (name.length > TEST_NAME_MAX) return { ok: false, message: `Keep the name under ${TEST_NAME_MAX} characters.` };
  return { ok: true, value: name };
}

/** One rubric area. `guide` is the scoring rule: reviewers see it, candidates never do. */
export interface Criterion {
  title: string;
  skill: string;
  points: number;
  guide: string;
}

/** Everything a version freezes, and a draft holds. */
export interface AssessmentContent {
  role: string;
  minutes: number | null;
  submission: Submission;
  toolsAllowed: string[];
  toolsNotAllowed: string[];
  instructions: string;
  taskTitle: string;
  taskBrief: string;
  sampleTitle: string;
  sampleBrief: string;
  rubric: Criterion[];
  results: ResultVisibility;
}

export interface Draft extends AssessmentContent {
  /** 0 when nothing is saved yet: the draft shown is startingDraft. */
  revision: number;
  updatedBy: string | null;
  updatedAt: string | null;
}

export interface Version extends AssessmentContent {
  id: string;
  slug: string;
  version: number;
  title: string;
  minutes: number;
  publishedBy: string;
  publishedAt: string;
}

type Result<T> = { ok: true; value: T } | { ok: false; message: string };

const text = (v: unknown) => (typeof v === "string" ? v.replace(/\r\n?/g, "\n").trim() : "");
const line = (v: unknown) => text(v).replace(/\s+/g, " ");

/** Where Klymb's first draft starts: the catalog's role, time, tools, rubric areas and practice task. The real task and scoring guides are left for a person to write. */
export function startingDraft(code: CatalogAssessment): Draft {
  return {
    revision: 0,
    updatedBy: null,
    updatedAt: null,
    role: code.role,
    minutes: code.minutes,
    submission: code.submission,
    toolsAllowed: [...code.tools.allowed],
    toolsNotAllowed: [...code.tools.notAllowed],
    instructions: "",
    taskTitle: "",
    taskBrief: "",
    sampleTitle: code.sampleTask.title,
    sampleBrief: code.sampleTask.brief,
    rubric: code.rubric.map((title) => ({ title, skill: code.suggestedSkills[0] ?? "", points: 4, guide: "" })),
    results: "none",
  };
}

/** A list typed one item per line. Blank lines go; repeats go. */
export function parseLines(raw: unknown): string[] {
  const items = (Array.isArray(raw) ? raw.map(text) : text(raw).split("\n")).map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean);
  return [...new Set(items)];
}

/**
 * What a Klymb admin may save. A draft can be unfinished (publishGaps says
 * what's missing), but every field must fit, so a save never fails at the
 * database.
 */
export function readContent(raw: Record<string, unknown>): Result<AssessmentContent> {
  const role = line(raw.role);
  if (role.length > LIMITS.role) return { ok: false, message: `Keep the role under ${LIMITS.role} characters.` };

  const rawMinutes = text(raw.minutes);
  let minutes: number | null = null;
  if (rawMinutes) {
    minutes = Number(rawMinutes);
    if (!Number.isInteger(minutes) || minutes < LIMITS.minutesMin || minutes > LIMITS.minutesMax) {
      return { ok: false, message: `Time allowed is whole minutes, from ${LIMITS.minutesMin} to ${LIMITS.minutesMax}.` };
    }
  }

  const submission = SUBMISSIONS.find((s) => s === raw.submission);
  if (!submission) return { ok: false, message: "Choose what people hand in." };
  const results = RESULTS.find((r) => r === raw.results);
  if (!results) return { ok: false, message: "Choose what candidates see afterwards." };

  const toolsAllowed = parseLines(raw.toolsAllowed);
  const toolsNotAllowed = parseLines(raw.toolsNotAllowed);
  for (const [list, name] of [[toolsAllowed, "allowed"], [toolsNotAllowed, "not allowed"]] as const) {
    if (list.length > LIMITS.tools) return { ok: false, message: `List at most ${LIMITS.tools} tools as ${name}.` };
    if (list.some((t) => t.length > LIMITS.tool)) return { ok: false, message: `Keep each tool under ${LIMITS.tool} characters.` };
  }
  const both = toolsAllowed.filter((t) => toolsNotAllowed.some((n) => n.toLowerCase() === t.toLowerCase()));
  if (both.length) return { ok: false, message: `"${both[0]}" is both allowed and not allowed.` };

  const instructions = text(raw.instructions);
  const taskTitle = line(raw.taskTitle);
  const taskBrief = text(raw.taskBrief);
  const sampleTitle = line(raw.sampleTitle);
  const sampleBrief = text(raw.sampleBrief);
  if (instructions.length > LIMITS.instructions) return { ok: false, message: `Keep the instructions under ${LIMITS.instructions} characters.` };
  if (taskTitle.length > LIMITS.title || sampleTitle.length > LIMITS.title) return { ok: false, message: `Keep task titles under ${LIMITS.title} characters.` };
  if (taskBrief.length > LIMITS.brief) return { ok: false, message: `Keep the task under ${LIMITS.brief} characters.` };
  if (sampleBrief.length > LIMITS.sampleBrief) return { ok: false, message: `Keep the practice task under ${LIMITS.sampleBrief} characters.` };

  if (!Array.isArray(raw.rubric)) return { ok: false, message: "The rubric didn't arrive. Reload and try again." };
  if (raw.rubric.length > LIMITS.criteria) return { ok: false, message: `A rubric has at most ${LIMITS.criteria} areas.` };
  const rubric: Criterion[] = [];
  for (const [i, c] of (raw.rubric as unknown[]).entries()) {
    const r = (c ?? {}) as Record<string, unknown>;
    const n = i + 1;
    const criterion = { title: line(r.title), skill: line(r.skill), points: Number(r.points), guide: text(r.guide) };
    if (criterion.title.length > LIMITS.criterionTitle) return { ok: false, message: `Rubric area ${n}: keep the name under ${LIMITS.criterionTitle} characters.` };
    if (criterion.skill.length > LIMITS.skill) return { ok: false, message: `Rubric area ${n}: keep the skill under ${LIMITS.skill} characters.` };
    if (!Number.isInteger(criterion.points) || criterion.points < 1 || criterion.points > LIMITS.pointsMax) {
      return { ok: false, message: `Rubric area ${n}: points are a whole number from 1 to ${LIMITS.pointsMax}.` };
    }
    if (criterion.guide.length > LIMITS.guide) return { ok: false, message: `Rubric area ${n}: keep the scoring guide under ${LIMITS.guide} characters.` };
    rubric.push(criterion);
  }
  const names = rubric.map((c) => c.title.toLowerCase()).filter(Boolean);
  if (new Set(names).size !== names.length) return { ok: false, message: "Two rubric areas have the same name." };

  return {
    ok: true,
    value: { role, minutes, submission, toolsAllowed, toolsNotAllowed, instructions, taskTitle, taskBrief, sampleTitle, sampleBrief, rubric, results },
  };
}

/** What a draft still needs before it can be published, in the order the form shows it. Empty when it is ready. */
export function publishGaps(c: AssessmentContent): string[] {
  const gaps: string[] = [];
  if (!c.role) gaps.push("the role");
  if (c.minutes === null) gaps.push("the time allowed");
  if (!c.instructions) gaps.push("instructions for candidates");
  if (!c.taskTitle || !c.taskBrief) gaps.push("the real task");
  if (!c.sampleTitle || !c.sampleBrief) gaps.push("the practice task");
  if (c.sampleTitle && c.taskTitle && c.sampleTitle.toLowerCase() === c.taskTitle.toLowerCase()) gaps.push("a practice task that differs from the real one");
  if (!c.rubric.length) gaps.push("at least one rubric area");
  const missing = c.rubric.filter((r) => !r.title || !r.skill || !r.guide).length;
  if (missing) gaps.push(`a name, skill and scoring guide for ${missing === 1 ? "1 rubric area" : `${missing} rubric areas`}`);
  return gaps;
}

/** Published content only, so a draft and a version can be compared. */
export function contentOf(c: AssessmentContent): AssessmentContent {
  return {
    role: c.role, minutes: c.minutes, submission: c.submission,
    toolsAllowed: [...c.toolsAllowed], toolsNotAllowed: [...c.toolsNotAllowed],
    instructions: c.instructions, taskTitle: c.taskTitle, taskBrief: c.taskBrief,
    sampleTitle: c.sampleTitle, sampleBrief: c.sampleBrief,
    rubric: c.rubric.map(({ title, skill, points, guide }) => ({ title, skill, points, guide })),
    results: c.results,
  };
}

/** True when publishing would make a copy of what is already the newest version. */
export const sameContent = (a: AssessmentContent, b: AssessmentContent) => JSON.stringify(contentOf(a)) === JSON.stringify(contentOf(b));

export const totalPoints = (rubric: readonly Criterion[]) => rubric.reduce((n, c) => n + c.points, 0);

/** The skills a version tests, from its rubric, in rubric order. */
export const skillsOf = (rubric: readonly Criterion[]) => [...new Set(rubric.map((c) => c.skill).filter(Boolean))];

/** A rubric as stored (jsonb). Anything malformed is left out rather than shown half-read. */
export function readRubric(raw: unknown): Criterion[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((c) => {
    const r = (c ?? {}) as Record<string, unknown>;
    const points = Number(r.points);
    if (typeof r.title !== "string" || typeof r.skill !== "string" || typeof r.guide !== "string" || !Number.isInteger(points)) return [];
    return [{ title: r.title, skill: r.skill, points, guide: r.guide }];
  });
}

// ── What a candidate sees ────────────────────────────────────────────────

/** A version as a candidate will see it (T07): no scoring guide, ever. */
export interface CandidateTask {
  title: string;
  role: string;
  minutes: number;
  submission: Submission;
  toolsAllowed: string[];
  toolsNotAllowed: string[];
  instructions: string;
  taskTitle: string;
  taskBrief: string;
  areas: { title: string; points: number }[];
  results: ResultVisibility;
}

export function candidateTask(v: Version): CandidateTask {
  return {
    title: v.title,
    role: v.role,
    minutes: v.minutes,
    submission: v.submission,
    toolsAllowed: [...v.toolsAllowed],
    toolsNotAllowed: [...v.toolsNotAllowed],
    instructions: v.instructions,
    taskTitle: v.taskTitle,
    taskBrief: v.taskBrief,
    areas: v.rubric.map(({ title, points }) => ({ title, points })),
    results: v.results,
  };
}

/** "60 minutes", "1 hour 30 minutes". */
export function minutesLabel(m: number): string {
  const h = Math.floor(m / 60);
  const rest = m % 60;
  const mins = `${rest} ${rest === 1 ? "minute" : "minutes"}`;
  if (!h) return mins;
  return `${h} ${h === 1 ? "hour" : "hours"}${rest ? ` ${mins}` : ""}`;
}

// ── A company's review ───────────────────────────────────────────────────

/** Approving or declining one version for one company. */
export function readReview(raw: { decision: unknown; note: unknown }): Result<{ decision: Decision; note: string | null }> {
  const decision = DECISIONS.find((d) => d === raw.decision);
  if (!decision) return { ok: false, message: "Choose approve or decline." };
  const note = text(raw.note);
  if (note.length > LIMITS.note) return { ok: false, message: `Keep the note under ${LIMITS.note} characters.` };
  if (decision === "declined" && !note) return { ok: false, message: "Say what Klymb should change, so the next version can fix it." };
  return { ok: true, value: { decision, note: note || null } };
}

export interface ReviewRow {
  versionId: string;
  decision: Decision;
  note: string | null;
  decidedBy: string;
  decidedAt: string;
}

type VersionRef = { version: number; id: string; minutes?: number };

export interface Standing {
  /** The newest published version, or null when Klymb hasn't published one. */
  latest: VersionRef | null;
  /** This company's decision on the newest version. */
  latestReview: ReviewRow | null;
  /** The newest version this company approved: what recruiters pick. */
  inUse: VersionRef | null;
}

/**
 * Where one company stands on one assessment. Only the newest version can
 * be decided; an older approval stays in use until a newer one is approved.
 */
export function standingOf(versions: readonly VersionRef[], reviews: ReadonlyMap<string, ReviewRow>): Standing {
  const sorted = [...versions].sort((a, b) => b.version - a.version);
  const latest = sorted[0] ?? null;
  const inUse = sorted.find((v) => reviews.get(v.id)?.decision === "approved") ?? null;
  const ref = (v: VersionRef): VersionRef => (v.minutes === undefined ? { version: v.version, id: v.id } : { version: v.version, id: v.id, minutes: v.minutes });
  return {
    latest: latest && ref(latest),
    latestReview: latest ? (reviews.get(latest.id) ?? null) : null,
    inUse: inUse && ref(inUse),
  };
}

/** One short line on where it stands, for the list. */
export function standingLabel(s: Standing): string {
  if (!s.latest) return "Not published yet";
  if (s.latestReview?.decision === "approved") return `Approved · version ${s.latest.version}`;
  const waiting = s.latestReview?.decision === "declined" ? `Version ${s.latest.version} declined` : `Version ${s.latest.version} waiting for review`;
  return s.inUse ? `${waiting} · version ${s.inUse.version} in use` : waiting;
}
