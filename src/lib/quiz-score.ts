import type { ChallengeQuiz } from "@/types/curriculum";

export interface QuizResult {
  score: number;
  total: number;
  /** Per question: what they chose, the right option, and why. */
  marks: { chosen: number; answer: number; explanation: string }[];
}

/** Scores answers against the key. Pure, so it is testable without a database. */
export function scoreQuiz(quiz: Pick<ChallengeQuiz, "questions">, answers: number[]): QuizResult {
  const marks = quiz.questions.map((q, i) => ({ chosen: answers[i] ?? -1, answer: q.answer, explanation: q.explanation }));
  return { score: marks.filter((m) => m.chosen === m.answer).length, total: marks.length, marks };
}
