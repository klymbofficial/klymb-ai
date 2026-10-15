import type { CurriculumDay, CurriculumModule } from "@/types/curriculum";
import type { Track, TrackSlug } from "@/types/program";
import { getTrack } from "@/data/tracks";
import { pmCurriculum, pmModules } from "@/data/pm-curriculum";
import { aiPmCurriculum, aiPmModules } from "./ai-product-manager";
import { juniorDevCurriculum, juniorDevModules } from "./junior-developer";
import { l1l2Curriculum, l1l2Modules } from "./l1-l2-support";
import { qaCurriculum, qaModules } from "./qa-engineer";
import { reportingAnalystCurriculum, reportingAnalystModules } from "./reporting-analyst";

/** Asked in almost every interview, whatever the role. */
const COMMON_QUESTIONS = [
  { question: "Tell me about yourself.", hint: "Two minutes: where you are, what you have built in these 30 days, and why this role next." },
  { question: "Why do you want this role?", hint: "A real reason tied to work you enjoyed, not the salary or the title." },
  { question: "Walk me through one project from your portfolio.", hint: "The problem, the decision you made, the evidence, and what you would change." },
  { question: "What is a weakness you are working on?", hint: "A true one, with what you are doing about it and proof it is improving." },
  { question: "Do you have any questions for us?", hint: "Two thoughtful questions about the team's work, never 'no'." },
];

/**
 * Days 29 and 30 are self-paced interview preparation: answer the questions
 * most often asked for this role, in writing, against what a strong answer
 * shows. No live mock rounds. Built from the track's own question bank, so
 * every track gets it without touching its course file.
 */
function interviewPrep(day: CurriculumDay, track: Track | undefined): CurriculumDay {
  const bank = track?.interviewQuestions ?? [];
  const first = day.day === 29;
  const role = bank.filter((q) => (first ? q.category !== "Behavioural" : q.category === "Behavioural"));
  const questions = first
    ? role.map((q) => ({ question: q.question, hint: q.whatGoodLooksLike }))
    : [...role.map((q) => ({ question: q.question, hint: q.whatGoodLooksLike })), ...COMMON_QUESTIONS];
  const file = `interview-prep/day-${day.day}.md`;
  return {
    ...day,
    title: first ? "Interview prep: most-asked technical and scenario questions" : "Interview prep: most-asked behavioural questions",
    mission: first
      ? `The questions ${track?.name ?? "this role"} interviews ask most often. Answer each one in writing, using your own work from the last 28 days as the example.`
      : "The questions every interviewer asks, plus the behavioural ones for this role. Write answers you could say out loud in two minutes, then say them out loud.",
    points: 50,
    estimateMinutes: 60,
    tags: ["Interview prep", first ? "Technical" : "Behavioural"],
    objectives: questions.map((q) => `${q.question} A strong answer: ${q.hint}`),
    concepts: first ? [] : ["The STAR method: situation, task, action, result"],
    steps: [
      "Read every question below and what a strong answer shows.",
      "Pick a real example from your portfolio for each one.",
      `Write your answers in ${file} in your repository, a short paragraph each.`,
      "Say each answer out loud once, timed. Cut anything past two minutes.",
      "Paste your best answers below and submit the link to the file.",
    ],
    deliverable: `<code>${file}</code>: a written answer to every question, each pointing at real work in your repo.`,
    reviewerChecks: "Answers use the learner's own work as evidence, are specific, and would fit in two minutes spoken.",
    resources: day.resources.filter((r) => r.kind === "prep" || r.kind === "read"),
    quiz: questions.slice(0, 5).map((q) => q.question),
  };
}

/** The 30 days and four modules behind each track's learner app. */
const raw: Record<TrackSlug, { days: CurriculumDay[]; modules: CurriculumModule[] }> = {
  "project-manager": { days: pmCurriculum, modules: pmModules },
  "l1-l2-support": { days: l1l2Curriculum, modules: l1l2Modules },
  "qa-engineer": { days: qaCurriculum, modules: qaModules },
  "junior-developer": { days: juniorDevCurriculum, modules: juniorDevModules },
  "reporting-analyst": { days: reportingAnalystCurriculum, modules: reportingAnalystModules },
  "ai-product-manager": { days: aiPmCurriculum, modules: aiPmModules },
};

export const curricula = Object.fromEntries(
  Object.entries(raw).map(([slug, c]) => [slug, { ...c, days: c.days.map((d) => (d.kind === "interview" ? interviewPrep(d, getTrack(slug)) : d)) }]),
) as typeof raw;

export function getCurriculum(track: string) {
  return curricula[track as TrackSlug] ?? null;
}

export function getCurriculumDay(track: string, day: number): CurriculumDay | undefined {
  return getCurriculum(track)?.days.find((d) => d.day === day);
}
