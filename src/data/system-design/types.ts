/**
 * Shared shape of a "System Design in 21 Days" lesson. Both languages of a day
 * must keep the same questions and choices in the same order: saved answers are
 * choice indexes, so switching language keeps a learner's progress.
 */

export type Lang = "en" | "hi";

export interface Choice {
  text: string;
  /** Why this choice is (or isn't) the best move. Shown after answering. */
  why: string;
  best?: boolean;
}

export interface Question {
  id: string;
  scenario?: string;
  prompt: string;
  choices: Choice[];
}

export interface Source {
  label: string;
  href: string;
}

export interface ConceptCard {
  name: string;
  examples: string[];
  moves: string[];
}

export interface DayCopy {
  /** The hook's small pill; defaults to "Interview question". */
  tag?: string;
  hookLines: string[];
  question: string;
  pre: Question[];
  revealTitle: string;
  revealSub: string;
  reveal: { when: string; what: string }[];
  sourceNote?: string;
  concept: { cards: ConceptCard[]; rule: string };
  post: Question[];
  interview: string[];
  cheatsheet: { title: string; points: string[] };
  linkedin: string;
  nextDay: string;
}

export interface Day {
  day: number;
  of: number;
  app: string;
  minutes: number;
  hook: { date: string; quote?: string; quoteBy?: string };
  copy: Record<Lang, DayCopy>;
  sources: Source[];
  video: { src: string; poster: string; minutes: number; lang: string };
  /** Pages around this one; the next day's card links only when it exists. */
  prevHref?: string;
  nextHref?: string;
}
