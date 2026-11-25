/**
 * Practical assessments' rules: what a draft holds, what a Klymb admin may
 * save, what stops a publish, what a candidate is shown, and where each
 * company stands on each version. Pure, so it can be tested; the database
 * side is src/lib/company/assessment-data.ts (migration 0076).
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
  questions: 20,
  sections: 10,
  section: 80,
  areasPerTest: 40,
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

/**
 * One question of a test with several (U04b): its section heading (empty:
 * none), what's asked, what the candidate hands in, and its own rubric.
 */
export interface Question {
  section: string;
  title: string;
  brief: string;
  submission: Submission;
  rubric: Criterion[];
  /** A multiple-choice question (L2): its options and marks. Its rubric is then empty and submission ignored. */
  mcq?: McqPart;
  /** The library question it was copied from, if any (L2). The copy never follows later edits. */
  source?: string;
}

/** One option of a multiple-choice question. */
export interface Choice {
  text: string;
  correct: boolean;
}

/** What a multiple-choice question adds: 2 to 8 options, its points, and partial marks when several are correct. */
export interface McqPart {
  options: Choice[];
  points: number;
  partial: boolean;
}

export const MCQ_LIMITS = { optionsMin: 2, optionsMax: 8, option: 500, points: 100 } as const;

/** True when the candidate picks every option that applies, not one. */
export const isMultiAnswer = (m: McqPart) => m.options.filter((o) => o.correct).length > 1;

/** What a question is worth: its points for multiple choice, its rubric's total otherwise. */
export const questionPoints = (q: Question) => (q.mcq ? q.mcq.points : q.rubric.reduce((n, c) => n + c.points, 0));

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
  /**
   * Null or missing: the one-task test, held in taskTitle, taskBrief,
   * submission and rubric. Set (U04b): the questions, and those four are
   * empty ('' and []), with submission saying whether any question takes files.
   */
  questions?: Question[] | null;
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

  const base = { role, minutes, toolsAllowed, toolsNotAllowed, instructions, sampleTitle, sampleBrief, results };

  // The editor sends questions (U04b); one question without a section is kept as the one-task test.
  if (raw.questions !== undefined) {
    if (!Array.isArray(raw.questions) || !raw.questions.length) return { ok: false, message: "A test needs at least one question." };
    if (raw.questions.length > LIMITS.questions) return { ok: false, message: `A test has at most ${LIMITS.questions} questions.` };
    const questions: Question[] = [];
    for (const [i, q] of (raw.questions as unknown[]).entries()) {
      const r = (q ?? {}) as Record<string, unknown>;
      const n = i + 1;
      const section = line(r.section);
      const title = line(r.title);
      const brief = text(r.brief);
      const source = typeof r.source === "string" && /^[0-9a-f-]{36}$/.test(r.source) ? r.source : undefined;
      if (r.kind === "mcq") {
        if (section.length > LIMITS.section) return { ok: false, message: `Question ${n}: keep the section name under ${LIMITS.section} characters.` };
        if (title.length > LIMITS.title) return { ok: false, message: `Question ${n}: keep the title under ${LIMITS.title} characters.` };
        if (brief.length > LIMITS.brief) return { ok: false, message: `Question ${n}: keep it under ${LIMITS.brief} characters.` };
        const mcq = readMcq(r, n);
        if (!mcq.ok) return mcq;
        questions.push({ section, title, brief, submission: "written", rubric: [], mcq: mcq.value, ...(source ? { source } : {}) });
        continue;
      }
      const sub = SUBMISSIONS.find((x) => x === r.submission);
      if (section.length > LIMITS.section) return { ok: false, message: `Question ${n}: keep the section name under ${LIMITS.section} characters.` };
      if (title.length > LIMITS.title) return { ok: false, message: `Question ${n}: keep the title under ${LIMITS.title} characters.` };
      if (brief.length > LIMITS.brief) return { ok: false, message: `Question ${n}: keep it under ${LIMITS.brief} characters.` };
      if (!sub) return { ok: false, message: `Question ${n}: choose what people hand in.` };
      const rubric = readCriteria(r.rubric, `Question ${n}, area`);
      if (!rubric.ok) return rubric;
      questions.push({ section, title, brief, submission: sub, rubric: rubric.value, ...(source ? { source } : {}) });
    }
    if (new Set(questions.map((q) => q.section.toLowerCase()).filter(Boolean)).size > LIMITS.sections) {
      return { ok: false, message: `A test has at most ${LIMITS.sections} sections.` };
    }
    if (questions.reduce((n, q) => n + q.rubric.length, 0) > LIMITS.areasPerTest) {
      return { ok: false, message: `A test has at most ${LIMITS.areasPerTest} rubric areas across its questions.` };
    }
    return { ok: true, value: fromQuestions(base, questions) };
  }

  const submission = SUBMISSIONS.find((s) => s === raw.submission);
  if (!submission) return { ok: false, message: "Choose what people hand in." };
  const rubric = readCriteria(raw.rubric, "Rubric area");
  if (!rubric.ok) return rubric;
  return { ok: true, value: { ...base, submission, taskTitle, taskBrief, rubric: rubric.value } };
}

/** A multiple-choice question's options and marks as typed. A draft may be unfinished; publishGaps says what's missing. */
function readMcq(r: Record<string, unknown>, n: number): Result<McqPart> {
  if (!Array.isArray(r.options)) return { ok: false, message: `Question ${n}: the options didn't arrive. Reload and try again.` };
  if (r.options.length > MCQ_LIMITS.optionsMax) return { ok: false, message: `Question ${n}: at most ${MCQ_LIMITS.optionsMax} options.` };
  const options: Choice[] = [];
  for (const o of r.options as unknown[]) {
    const x = (o ?? {}) as Record<string, unknown>;
    const t = text(x.text);
    if (t.length > MCQ_LIMITS.option) return { ok: false, message: `Question ${n}: keep each option under ${MCQ_LIMITS.option} characters.` };
    options.push({ text: t, correct: x.correct === true });
  }
  const points = Number(r.points);
  if (!Number.isInteger(points) || points < 1 || points > MCQ_LIMITS.points) return { ok: false, message: `Question ${n}: points are a whole number from 1 to ${MCQ_LIMITS.points}.` };
  const part = { options, points, partial: false };
  return { ok: true, value: { ...part, partial: r.partial === true && isMultiAnswer(part) } };
}

/** A rubric as typed: at most 10 areas, each within its limits, no two with one name. */
export function readCriteria(raw: unknown, what: string): Result<Criterion[]> {
  if (!Array.isArray(raw)) return { ok: false, message: "The rubric didn't arrive. Reload and try again." };
  if (raw.length > LIMITS.criteria) return { ok: false, message: `A rubric has at most ${LIMITS.criteria} areas.` };
  const rubric: Criterion[] = [];
  for (const [i, c] of (raw as unknown[]).entries()) {
    const r = (c ?? {}) as Record<string, unknown>;
    const n = `${what} ${i + 1}`;
    const criterion = { title: line(r.title), skill: line(r.skill), points: Number(r.points), guide: text(r.guide) };
    if (criterion.title.length > LIMITS.criterionTitle) return { ok: false, message: `${n}: keep the name under ${LIMITS.criterionTitle} characters.` };
    if (criterion.skill.length > LIMITS.skill) return { ok: false, message: `${n}: keep the skill under ${LIMITS.skill} characters.` };
    if (!Number.isInteger(criterion.points) || criterion.points < 1 || criterion.points > LIMITS.pointsMax) {
      return { ok: false, message: `${n}: points are a whole number from 1 to ${LIMITS.pointsMax}.` };
    }
    if (criterion.guide.length > LIMITS.guide) return { ok: false, message: `${n}: keep the scoring guide under ${LIMITS.guide} characters.` };
    rubric.push(criterion);
  }
  const names = rubric.map((c) => c.title.toLowerCase()).filter(Boolean);
  if (new Set(names).size !== names.length) return { ok: false, message: what.startsWith("Question") ? `${what.replace(/, area$/, "")}: two rubric areas have the same name.` : "Two rubric areas have the same name." };
  return { ok: true, value: rubric };
}

/** The questions a test asks: its own list, or the one-task test as a single question without a section. */
export function questionsOf(c: AssessmentContent): Question[] {
  if (c.questions?.length) return c.questions;
  return [{ section: "", title: c.taskTitle, brief: c.taskBrief, submission: c.submission, rubric: c.rubric }];
}

/** True when the test has several questions or sections, which publishing doesn't take yet (U04b-2). */
export const hasQuestions = (c: AssessmentContent) => !!c.questions?.length;

/**
 * Content from questions: one question without a section stays the
 * one-task test, so nothing changes for it; anything else is held as
 * questions, with the one-task fields empty.
 */
export function fromQuestions(
  base: Omit<AssessmentContent, "submission" | "taskTitle" | "taskBrief" | "rubric" | "questions">,
  questions: Question[],
): AssessmentContent {
  const [only] = questions;
  if (questions.length === 1 && !only.section && !only.mcq) {
    return { ...base, submission: only.submission, taskTitle: only.title, taskBrief: only.brief, rubric: only.rubric };
  }
  return {
    ...base,
    submission: questions.some((q) => !q.mcq && q.submission === "written_file") ? "written_file" : "written",
    taskTitle: "",
    taskBrief: "",
    rubric: [],
    questions,
  };
}

/** What a draft still needs before it can be published, in the order the form shows it. Empty when it is ready. */
export function publishGaps(c: AssessmentContent): string[] {
  const gaps: string[] = [];
  if (!c.role) gaps.push("the role");
  if (c.minutes === null) gaps.push("the time allowed");
  if (!c.instructions) gaps.push("instructions for candidates");
  if (!hasQuestions(c)) {
    if (!c.taskTitle || !c.taskBrief) gaps.push("the real task");
    if (!c.sampleTitle || !c.sampleBrief) gaps.push("the practice task");
    if (c.sampleTitle && c.taskTitle && c.sampleTitle.toLowerCase() === c.taskTitle.toLowerCase()) gaps.push("a practice task that differs from the real one");
    if (!c.rubric.length) gaps.push("at least one rubric area");
    const missing = c.rubric.filter((r) => !r.title || !r.skill || !r.guide).length;
    if (missing) gaps.push(`a name, skill and scoring guide for ${missing === 1 ? "1 rubric area" : `${missing} rubric areas`}`);
    return gaps;
  }
  const qs = c.questions!;
  if (!c.sampleTitle || !c.sampleBrief) gaps.push("the practice task");
  if (c.sampleTitle && qs.some((q) => q.title.toLowerCase() === c.sampleTitle.toLowerCase())) gaps.push("a practice task that differs from every question");
  qs.forEach((q, i) => {
    const n = i + 1;
    if (!q.title || !q.brief) gaps.push(`a title and text for question ${n}`);
    if (q.mcq) {
      const opts = q.mcq.options;
      if (opts.length < MCQ_LIMITS.optionsMin || opts.some((o) => !o.text)) gaps.push(`${MCQ_LIMITS.optionsMin} or more filled-in options for question ${n}`);
      else if (new Set(opts.map((o) => o.text.toLowerCase())).size !== opts.length) gaps.push(`different options for question ${n}`);
      if (!opts.some((o) => o.correct)) gaps.push(`a correct option for question ${n}`);
      else if (opts.every((o) => o.correct)) gaps.push(`at least one wrong option for question ${n}`);
      return;
    }
    if (!q.rubric.length) gaps.push(`at least one rubric area for question ${n}`);
    const missing = q.rubric.filter((r) => !r.title || !r.skill || !r.guide).length;
    if (missing) gaps.push(`a name, skill and scoring guide for ${missing === 1 ? "1 area" : `${missing} areas`} of question ${n}`);
  });
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
    questions: c.questions?.length
      ? c.questions.map((q) => ({
        section: q.section, title: q.title, brief: q.brief, submission: q.submission,
        rubric: q.rubric.map(({ title, skill, points, guide }) => ({ title, skill, points, guide })),
        ...(q.mcq ? { mcq: { options: q.mcq.options.map(({ text, correct }) => ({ text, correct })), points: q.mcq.points, partial: q.mcq.partial } } : {}),
        ...(q.source ? { source: q.source } : {}),
      }))
      : null,
  };
}

/** True when publishing would make a copy of what is already the newest version. */
export const sameContent = (a: AssessmentContent, b: AssessmentContent) => JSON.stringify(contentOf(a)) === JSON.stringify(contentOf(b));

export const totalPoints = (rubric: readonly Criterion[]) => rubric.reduce((n, c) => n + c.points, 0);

/** The skills a version tests, from its rubric, in rubric order. */
export const skillsOf = (rubric: readonly Criterion[]) => [...new Set(rubric.map((c) => c.skill).filter(Boolean))];

/** Questions as stored (jsonb); null when there are none or they can't be read. */
export function readQuestions(raw: unknown): Question[] | null {
  if (!Array.isArray(raw) || !raw.length) return null;
  const out: Question[] = [];
  for (const q of raw) {
    const r = (q ?? {}) as Record<string, unknown>;
    const submission = SUBMISSIONS.find((x) => x === r.submission);
    if (typeof r.section !== "string" || typeof r.title !== "string" || typeof r.brief !== "string" || !submission) return null;
    const m = (r.mcq ?? null) as Record<string, unknown> | null;
    const mcq: McqPart | undefined =
      m && Array.isArray(m.options) && Number.isInteger(m.points)
        ? {
            options: (m.options as unknown[]).flatMap((o) => {
              const x = (o ?? {}) as Record<string, unknown>;
              return typeof x.text === "string" ? [{ text: x.text, correct: x.correct === true }] : [];
            }),
            points: m.points as number,
            partial: m.partial === true,
          }
        : undefined;
    out.push({
      section: r.section, title: r.title, brief: r.brief, submission, rubric: readRubric(r.rubric),
      ...(mcq ? { mcq } : {}),
      ...(typeof r.source === "string" ? { source: r.source } : {}),
    });
  }
  return out;
}

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
  /** A test with several questions (L2): each as the candidate sees it; null for a one-task test. */
  questions: CandidateQuestion[] | null;
}

/** One question as a candidate sees it: never the right options, never a scoring guide. */
export interface CandidateQuestion {
  /** 1-based, as answers are stored. */
  no: number;
  section: string;
  title: string;
  brief: string;
  kind: "written" | "written_file" | "mcq";
  /** Multiple choice: the options' words, in order. */
  options: string[];
  /** Multiple choice: pick all that apply rather than one. */
  multi: boolean;
  points: number;
  areas: { title: string; points: number }[];
}

/** The questions of a version as a candidate sees them. */
export function candidateQuestions(qs: readonly Question[]): CandidateQuestion[] {
  return qs.map((q, i) => ({
    no: i + 1,
    section: q.section,
    title: q.title,
    brief: q.brief,
    kind: q.mcq ? "mcq" : q.submission,
    options: q.mcq ? q.mcq.options.map((o) => o.text) : [],
    multi: q.mcq ? isMultiAnswer(q.mcq) : false,
    points: questionPoints(q),
    areas: q.rubric.map(({ title, points }) => ({ title, points })),
  }));
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
    questions: v.questions?.length ? candidateQuestions(v.questions) : null,
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
