export type TrackSlug =
  | "qa-engineer"
  | "l1-l2-support"
  | "project-manager"
  | "junior-developer"
  | "reporting-analyst";

export type WeekNumber = 1 | 2 | 3 | 4;

export interface DailyChallenge {
  day: number;
  title: string;
  /** One-line description of the workplace problem */
  problem: string;
}

export interface WeeklyAssessment {
  afterDay: 7 | 14 | 21 | 28;
  title: string;
  task: string;
  format: string;
}

export interface TrackWeek {
  week: WeekNumber;
  /** Role-specific title for this week */
  title: string;
  focus: string;
  /** What is covered during the week (daily problems) */
  challenges: DailyChallenge[];
  assessment: WeeklyAssessment;
}

export interface InterviewQuestion {
  category: "Technical" | "Scenario" | "Behavioural";
  question: string;
  whatGoodLooksLike: string;
}

export interface Track {
  slug: TrackSlug;
  name: string;
  /** Open for registration now. */
  available: boolean;
  /**
   * Its day-by-day course is built into the learner app. Only these tracks
   * enrol straight into Day 1; the rest reserve a place and are emailed when
   * their course opens. Kept separate from `available` so registration can
   * open before the content is ready.
   */
  contentLive: boolean;
  /** Where the role is heading in AI-native teams */
  becomes: string;
  description: string;
  whoItsFor: string[];
  skills: string[];
  whatsChanging: string;
  carryOver: string[];
  weeks: TrackWeek[];
  projects: string[];
  outcomes: string[];
  interviewTopics: string[];
  interviewQuestions: InterviewQuestion[];
}

export interface WeekPhase {
  week: WeekNumber;
  name: string;
  days: string;
  summary: string;
}

export interface Source {
  label: string;
  url: string;
}

export interface Evidence {
  figure: string;
  claim: string;
  source: Source;
}

export interface Faq {
  question: string;
  answer: string;
}
