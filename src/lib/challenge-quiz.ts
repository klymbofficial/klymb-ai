import "server-only";
import { challengeContent, type ChallengeSlug } from "@/data/challenges";
import { db } from "@/lib/db/client";
import type { ChallengeQuiz } from "@/types/curriculum";
import { scoreQuiz, type QuizResult } from "@/lib/quiz-score";

/** Postgres: no such table. Code can go live before its migration. */
const UNDEFINED_TABLE = "42P01";

/** What the browser may see of a quiz: the questions and options, never the answers. */
export interface PublicQuiz {
  week: number;
  title: string;
  questions: { question: string; options: string[] }[];
}


function quizOf(track: string, week: number): ChallengeQuiz | undefined {
  return challengeContent[track as ChallengeSlug]?.quizzes.find((q) => q.week === week);
}

/** The quiz for a challenge's week, stripped of its answers, or undefined when that week has none. */
export function publicQuiz(track: string, week: number): PublicQuiz | undefined {
  const q = quizOf(track, week);
  return q && { week: q.week, title: q.title, questions: q.questions.map(({ question, options }) => ({ question, options })) };
}

/**
 * Scores one try and records it against the learner's row. The score is
 * returned even when it could not be saved (an outage, or the table not
 * there yet): the learner still sees how they did.
 */
export async function gradeQuiz(learnerId: string, track: string, week: number, answers: number[]): Promise<QuizResult | null> {
  const quiz = quizOf(track, week);
  if (!quiz || answers.length !== quiz.questions.length) return null;
  const result = scoreQuiz(quiz, answers);
  const sql = db();
  if (sql) {
    const { error } = await sql.run`
      insert into course.challenge_quiz_attempts (learner_id, week, attempt, score, total, answers)
      select ${learnerId}, ${week}, coalesce(max(attempt), 0) + 1, ${result.score}, ${result.total}, ${answers}::smallint[]
        from course.challenge_quiz_attempts
       where learner_id = ${learnerId} and week = ${week}
      having coalesce(max(attempt), 0) < 20
    `;
    if (error && error.code !== UNDEFINED_TABLE) console.error("quiz attempt not saved:", error.code);
  }
  return result;
}

/** Their best score on each week's quiz so far, for the day page and the track page. */
export async function bestQuizScores(learnerId: string): Promise<Record<number, { score: number; total: number }>> {
  const sql = db();
  if (!sql) return {};
  const { data, error } = await sql.rows<{ week: number; score: number; total: number }>`
    select distinct on (week) week, score, total from course.challenge_quiz_attempts
     where learner_id = ${learnerId}
     order by week, score desc, taken_at
  `;
  if (error && error.code !== UNDEFINED_TABLE) console.error("quiz scores read failed:", error.code);
  return Object.fromEntries((data ?? []).map((r) => [r.week, { score: r.score, total: r.total }]));
}
