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
}
