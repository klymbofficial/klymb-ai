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

/** "Build it yourself": drag each box to the slot whose job it does. */
export interface BuildTask {
  title: string;
  intro: string;
  /** The fixed node at the top of the diagram (e.g. "Your phone"). */
  given: string;
  /** Slot ids per row, top to bottom. */
  rows: string[][];
  slots: Record<string, { role: string; answer: string }>;
  /** Boxes in the tray; `does` is shown as the hint after a wrong drop. A chip no slot answers is a decoy. */
  chips: { id: string; label: string; does: string }[];
  done: string;
}

/** An interviewer's "what if" after the main answer, with the model answer. */
export interface FollowUp {
  q: string;
  answer: string[];
  /** The one line worth saying out loud. */
  say: string;
  /** Where the course goes deeper. */
  deeper?: string;
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
  /** Terms the video covers that deserve a plain explanation in the reveal (e.g. HTTP, TCP, UDP). */
  explain?: { title: string; items: { term: string; what: string; example: string }[] };
  concept: { cards: ConceptCard[]; rule: string };
  post: Question[];
  build?: BuildTask;
  followUps?: FollowUp[];
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
  /** Portrait (9:16) for the standalone Day page; `wide` is the 16:9 cut the course app's player plays when it exists. */
  video: { src: string; poster: string; minutes: number; lang: string; wide?: { src: string; poster: string } };
  /** Pages around this one; the next day's card links only when it exists. */
  prevHref?: string;
  nextHref?: string;
}
