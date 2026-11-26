/**
 * Automatic tests by job role (P0.4 of ASSESSMENT_PRIORITY_PLAN.txt): pick
 * multiple-choice questions for a role's skills from the Klymb Library and
 * the company's own, with a balanced difficulty mix, and build the draft a
 * company can preview and publish without opening the editor. Pure, so it
 * can be tested; no AI and no paid service. The server picks once and saves
 * the questions as copies with their source ids.
 */
import type { AssessmentContent, Question } from "@/lib/company/assessment-rules";
import type { Difficulty, LibraryQuestion } from "@/lib/company/library-rules";

export const AUTO_LIMITS = { min: 5, max: 20, default: 10, skills: 12 } as const;

export interface AssessmentRole {
  slug: string;
  label: string;
  summary: string;
  skills: string[];
}

export type Mix = Record<Difficulty, number>;

/** The experience a test is pitched at (user, 26 Nov: from a job description). */
export const LEVELS = ["junior", "mid", "senior"] as const;
export type Level = (typeof LEVELS)[number];
export const LEVEL_LABEL: Record<Level, string> = { junior: "Junior (0–2 years)", mid: "Mid-level (2–5 years)", senior: "Senior (5+ years)" };
/** Easy and hard shares by level; the rest is medium. Mid-level is the long-standing default. */
const LEVEL_SHARE: Record<Level, { easy: number; hard: number }> = { junior: { easy: 0.5, hard: 0.1 }, mid: { easy: 0.3, hard: 0.2 }, senior: { easy: 0.15, hard: 0.4 } };

/** The planned mix for a count: by default 30% easy, 20% hard, the rest medium (10 → 3 / 5 / 2); junior and senior lean easier or harder. */
export function plannedMix(count: number, level: Level = "mid"): Mix {
  const easy = Math.round(count * LEVEL_SHARE[level].easy);
  const hard = Math.round(count * LEVEL_SHARE[level].hard);
  return { easy, medium: count - easy - hard, hard };
}

const norm = (s: string) => s.trim().toLowerCase();

/** What availability needs of a question: never its options, so it can go to the browser. */
export type PoolItem = Pick<LibraryQuestion, "id" | "type" | "status" | "tags" | "difficulty" | "points" | "minutes">;

/** Published multiple-choice questions tagged with any of the skills, each once. */
export function eligible<T extends PoolItem>(pool: readonly T[], skills: readonly string[]): T[] {
  const want = new Set(skills.map(norm));
  const seen = new Set<string>();
  return pool.filter((q) => {
    if (q.type !== "mcq" || q.status !== "published" || seen.has(q.id)) return false;
    if (!q.tags.some((t) => want.has(norm(t)))) return false;
    seen.add(q.id);
    return true;
  });
}

/** How many questions each skill and difficulty offers, for the form's summary. */
export function availability(pool: readonly PoolItem[], skills: readonly string[]) {
  const list = eligible(pool, skills);
  const bySkill = Object.fromEntries(skills.map((s) => [s, list.filter((q) => q.tags.some((t) => norm(t) === norm(s))).length]));
  const byDifficulty: Mix = { easy: 0, medium: 0, hard: 0 };
  for (const q of list) byDifficulty[q.difficulty] += 1;
  return { total: list.length, bySkill, byDifficulty };
}

export type PickResult =
  | { ok: true; questions: LibraryQuestion[]; mix: Mix; planned: Mix; adapted: boolean }
  | { ok: false; reason: "no_skills" | "skill_empty" | "short"; message: string; available: number; emptySkills: string[] };

function shuffle<T>(list: readonly T[], rand: () => number): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Picks `count` questions: every chosen skill covered at least once, then
 * the planned difficulty mix, borrowing from the next difficulty when one
 * runs short (and saying so). Never pads with questions outside the skills.
 */
export function pickQuestions(pool: readonly LibraryQuestion[], skills: readonly string[], count: number, rand: () => number = Math.random, level: Level = "mid"): PickResult {
  const list = eligible(pool, skills);
  if (!skills.length) return { ok: false, reason: "no_skills", message: "Choose at least one skill.", available: 0, emptySkills: [] };
  const emptySkills = skills.filter((s) => !list.some((q) => q.tags.some((t) => norm(t) === norm(s))));
  if (emptySkills.length) {
    return { ok: false, reason: "skill_empty", message: `No questions cover ${emptySkills.join(", ")} yet. Remove ${emptySkills.length === 1 ? "it" : "them"}, or choose Manual.`, available: list.length, emptySkills };
  }
  if (list.length < count) {
    return { ok: false, reason: "short", message: `Only ${list.length} questions match these skills. Ask for ${list.length} or fewer, add skills, or choose Manual.`, available: list.length, emptySkills: [] };
  }
  const planned = plannedMix(count, level);
  const byLevel: Record<Difficulty, LibraryQuestion[]> = { easy: [], medium: [], hard: [] };
  for (const q of shuffle(list, rand)) byLevel[q.difficulty].push(q);
  const chosen: LibraryQuestion[] = [];
  const take = (q: LibraryQuestion) => { chosen.push(q); byLevel[q.difficulty] = byLevel[q.difficulty].filter((x) => x.id !== q.id); };
  const left: Mix = { ...planned };

  // Coverage first: one question per skill, from a difficulty that still has room.
  for (const s of shuffle(skills, rand)) {
    if (chosen.some((q) => q.tags.some((t) => norm(t) === norm(s)))) continue;
    if (chosen.length >= count) break;
    const order: Difficulty[] = (["medium", "easy", "hard"] as Difficulty[]).sort((a, b) => left[b] - left[a]);
    for (const d of order) {
      const hit = byLevel[d].find((q) => q.tags.some((t) => norm(t) === norm(s)));
      if (hit) { take(hit); left[d] -= 1; break; }
    }
  }
  // Then the mix; a short level borrows from its neighbours.
  for (const d of ["easy", "medium", "hard"] as Difficulty[]) {
    while (left[d] > 0 && byLevel[d].length) { take(byLevel[d][0]); left[d] -= 1; }
  }
  const fallback: Difficulty[] = ["medium", "easy", "hard"];
  while (chosen.length < count) {
    const d = fallback.find((x) => byLevel[x].length);
    if (!d) break;
    take(byLevel[d][0]);
  }
  const mix: Mix = { easy: 0, medium: 0, hard: 0 };
  for (const q of chosen) mix[q.difficulty] += 1;
  const order: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };
  chosen.sort((a, b) => order[a.difficulty] - order[b.difficulty]);
  return { ok: true, questions: chosen, mix, planned, adapted: mix.easy !== planned.easy || mix.medium !== planned.medium || mix.hard !== planned.hard };
}

/** Total points and a suggested time: the questions' minutes, rounded up to 5, at least 10. */
export function summarise(questions: readonly Pick<LibraryQuestion, "points" | "minutes">[]) {
  const points = questions.reduce((n, q) => n + q.points, 0);
  const raw = questions.reduce((n, q) => n + q.minutes, 0);
  return { count: questions.length, points, minutes: Math.max(10, Math.ceil(raw / 5) * 5) };
}

/** A library question as a test question: a copy that remembers its source. */
export function asTestQuestion(q: LibraryQuestion): Question {
  return {
    section: "",
    title: q.title,
    brief: q.statement,
    submission: "written",
    rubric: [],
    mcq: { options: (q.options ?? []).map((o) => ({ text: o.text, correct: o.correct })), points: q.points, partial: q.partial },
    source: q.id,
  };
}

/** The whole draft for an automatic test: ready to publish as it stands. */
export function autoContent(role: string, questions: readonly LibraryQuestion[], minutes: number): AssessmentContent {
  return {
    role,
    minutes,
    submission: "written",
    toolsAllowed: [],
    toolsNotAllowed: ["AI assistants", "Help from another person"],
    instructions: `${questions.length} multiple-choice questions. Some ask you to pick every correct option; those give partial marks and never go below zero. Your answers save as you go, and you can move between questions until you submit or the time runs out.`,
    taskTitle: "",
    taskBrief: "",
    sampleTitle: "Practice: how the questions work",
    sampleBrief: "Each question shows its points. A round button means one answer; square boxes mean pick every option that applies. Nothing is marked until you submit.",
    rubric: [],
    results: "overall",
    questions: questions.map(asTestQuestion),
  };
}

/** Skills from a form: trimmed, no repeats, within the limit. */
export function readSkills(raw: unknown): string[] {
  const parts = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(",") : [];
  const out: string[] = [];
  for (const p of parts) {
    const s = typeof p === "string" ? p.trim().replace(/\s+/g, " ") : "";
    if (s && s.length <= 40 && !out.some((x) => norm(x) === norm(s))) out.push(s);
  }
  return out.slice(0, AUTO_LIMITS.skills);
}
