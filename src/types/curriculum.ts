export type DayKind = "build" | "assessment" | "interview";

export interface DayResource {
  kind: "watch" | "read" | "use" | "prep";
  label: string;
  url: string;
}

export interface PmDay {
  day: number;
  week: number;
  kind: DayKind;
  title: string;
  /** One or two sentences: what today changes about how they work. */
  mission: string;
  points: number;
  estimateMinutes: number;
  tags: string[];
  objectives: string[];
  concepts: string[];
  /** Numbered build steps, walked one at a time. */
  steps: string[];
  deliverable: string;
  reviewerChecks: string;
  resources: DayResource[];
  /** Knowledge checks answerable only by someone who did the work. */
  quiz: string[];
  /** Challenges: the day's full task, in light Markdown (bold, code, lists). */
  brief?: string;
  /** Challenges: a ready-made LinkedIn post to adapt and publish. */
  linkedinTemplate?: string;
  /** What the LinkedIn post should show today. */
  post?: string;
  /** A prompt to paste into the AI tool, as given. */
  prompt?: string;
  /** A walkthrough video of the day's solution. */
  video?: string;
  /** A tool the day introduces. */
  tool?: { name: string; description: string; url?: string };
}

/** A weekly multiple-choice quiz. `answer` is the index of the right option and never leaves the server. */
export interface ChallengeQuiz {
  week: number;
  title: string;
  questions: { question: string; options: string[]; answer: number; explanation: string }[];
}

/** Every track's day uses the same shape; PmDay is the original name. */
export type CurriculumDay = PmDay;

export interface CurriculumModule {
  week: number;
  name: string;
  days: string;
  summary: string;
}
