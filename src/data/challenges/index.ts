/**
 * The four 60-day challenges' content: their days, weekly modules and quizzes.
 *
 * Converted once from the challenges' source files by scripts/convert-challenges.py,
 * which also rebrands them for klymb.ai; re-run it rather than hand-editing the
 * JSON when the source changes. Server-side only in practice: the quizzes carry
 * their answers, so nothing here may reach a client component.
 */
import type { ChallengeQuiz, CurriculumDay, CurriculumModule } from "@/types/curriculum";
import claude from "./claude.json";
import artificialIntelligence from "./artificial-intelligence.json";
import softwareEngineering from "./software-engineering.json";
import dataScience from "./data-science.json";

type ChallengeContent = { days: CurriculumDay[]; modules: CurriculumModule[]; quizzes: ChallengeQuiz[] };

export const challengeContent = {
  claude: claude as ChallengeContent,
  "artificial-intelligence": artificialIntelligence as ChallengeContent,
  "software-engineering": softwareEngineering as ChallengeContent,
  "data-science": dataScience as ChallengeContent,
};

export type ChallengeSlug = keyof typeof challengeContent;
