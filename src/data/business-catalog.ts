/**
 * The business catalog's Klymb-written items: what each one is, who it is for,
 * what it covers and what a company can look at before choosing it.
 *
 * Whether a company sees any of it is decided elsewhere: publication state,
 * skill tags and purposes live in the database (migration 0049), set by a
 * Klymb admin at /admin/catalog, and an item reaches a company only once it is
 * published and granted to that company. Programs (items in an order) exist
 * only in the database. One course serves every company granted it; nothing
 * here is copied per company.
 *
 * DRAFT WORDING (written 2026-11-21 for the pilot, to be reviewed by Klymb
 * before publishing): both assessments. What is here is only where a Klymb
 * admin's first draft starts (src/lib/company/assessment-rules.ts,
 * startingDraft). The test itself, with the real task and the reviewers'
 * scoring guide, is written and published as numbered versions at
 * /admin/catalog/assessments (migration 0051). No answer key or scoring rule
 * is kept here.
 */
import { MODULES } from "@/data/system-design/course-app";

export const CATALOG_KINDS = ["course", "assessment", "program"] as const;
export type CatalogKind = (typeof CATALOG_KINDS)[number];

export const CATALOG_PURPOSES = ["workforce", "hiring"] as const;
export type CatalogPurpose = (typeof CATALOG_PURPOSES)[number];

export const PURPOSE_LABEL: Record<CatalogPurpose, string> = { workforce: "Upskilling teams", hiring: "Hiring" };
export const KIND_LABEL: Record<CatalogKind, string> = { course: "Course", assessment: "Assessment", program: "Program" };

export type CatalogLevel = "Beginner" | "Intermediate" | "Advanced";

interface Common {
  slug: string;
  title: string;
  summary: string;
  /** What a company would use it for. */
  purpose: string;
  /** Who takes it. */
  audience: string;
  level: CatalogLevel;
  /** How long it takes, in words. */
  duration: string;
  outcomes: readonly string[];
  author: string;
  /** Where a Klymb admin starts from; companies see what is saved at /admin/catalog. */
  suggestedSkills: readonly string[];
  suggestedPurposes: readonly CatalogPurpose[];
}

export interface CatalogCourse extends Common {
  kind: "course";
  /** What a company can look at before choosing it: every module and lesson title, and the public page. */
  preview: { modules: readonly { title: string; lessons: readonly string[] }[]; pageHref: string };
  /** Whether a company can assign it today (the pilot assigns System Design only). */
  assignable: boolean;
}

export interface CatalogAssessment extends Common {
  kind: "assessment";
  format: string;
  /** What reviewers look for, in plain words. Never the scoring rules or an answer. */
  rubric: readonly string[];
  tools: { allowed: readonly string[]; notAllowed: readonly string[] };
  /** A practice task, deliberately not the one people will be given. */
  sampleTask: { title: string; brief: string };
  /** The course to assign after it, for a baseline. */
  followUp?: string;
  /** The course candidates can prepare with, for a hiring test. */
  prep?: string;
  /** Where the first draft starts: the role it tests, minutes allowed, and what people hand in. */
  role: string;
  minutes: number;
  submission: "written" | "written_file";
  /** Until T07 builds the runner, nobody can take it. */
  runnable: false;
}

export type CodeItem = CatalogCourse | CatalogAssessment;

/** "Days 1–8 · Foundations" → "Foundations". */
const moduleName = (title: string) => title.replace(/^Days?\s+[\d–-]+\s*·\s*/, "");
const sdLessons = MODULES.reduce((n, m) => n + m.lessons.length, 0);
const systemDesign: CatalogCourse = {
  kind: "course",
  slug: "system-design",
  title: "System Design",
  summary: "System design explained with real examples, in short video lessons with quick checks.",
  purpose: "Give engineers a shared way to design and discuss systems that scale, or help candidates prepare for a system design round.",
  audience: "Software engineers",
  level: "Intermediate",
  duration: `${sdLessons} lessons, about 15 minutes a day`,
  outcomes: [
    "Explain how an application is served, and why it slows down under load",
    "Use load balancing, caching, replication, sharding and queues, and say what each one costs",
    "Work through design problems: notifications, a feed, ticket booking, chat and video streaming",
    "Design an AI assistant with retrieval, weighing latency, cost, safety and quality",
    "Pass a final assessment: 70% to pass, three tries",
  ],
  author: "Klymb",
  suggestedSkills: ["System design", "Scalability", "Distributed systems", "AI system design"],
  suggestedPurposes: ["workforce", "hiring"],
  preview: {
    modules: MODULES.map((m) => ({ title: moduleName(m.title), lessons: m.lessons.map(([t]) => t) })),
    pageHref: "/system-design",
  },
  assignable: true,
};

const systemDesignBaseline: CatalogAssessment = {
  kind: "assessment",
  slug: "system-design-baseline",
  title: "System design baseline",
  summary: "A short written check of how someone approaches a design problem today, before any course.",
  purpose: "Find where each engineer starts, then assign the follow-up course to the people who need it.",
  audience: "Software engineers",
  level: "Intermediate",
  duration: "30 minutes",
  format: "One design case, answered in writing",
  outcomes: ["A starting result per person in each rubric area", "Who would gain most from the follow-up course"],
  author: "Klymb",
  suggestedSkills: ["System design", "Scalability"],
  suggestedPurposes: ["workforce"],
  rubric: [
    "Clarifies requirements and scale before designing",
    "Proposes a workable high-level design",
    "Chooses storage and data flow, with reasons",
    "Plans for load, failure and growth",
    "Explains trade-offs clearly",
  ],
  tools: { allowed: ["Notes, paper or a drawing tool"], notAllowed: ["AI assistants", "Help from another person"] },
  sampleTask: {
    title: "Design a link shortener",
    brief: "Sketch a service that turns long links into short ones and redirects visitors, at about a million new links a day. Say what you would store, how a redirect stays fast, and what you would change at ten times the traffic.",
  },
  followUp: "system-design",
  role: "Software engineer",
  minutes: 30,
  submission: "written",
  runnable: false,
};

const backendDesignPractical: CatalogAssessment = {
  kind: "assessment",
  slug: "backend-design-practical",
  title: "Backend design practical",
  summary: "A practical hiring test: candidates design a small backend service and explain their choices.",
  purpose: "Compare candidates for backend roles on the same realistic task, against the same rubric.",
  audience: "Candidates for backend engineering roles",
  level: "Intermediate",
  duration: "60 minutes",
  format: "One practical case: a written design, with a diagram uploaded as a file",
  outcomes: ["A result per rubric area for each candidate", "A written design to discuss in the next interview"],
  author: "Klymb",
  suggestedSkills: ["System design", "Backend engineering", "API design"],
  suggestedPurposes: ["hiring"],
  rubric: [
    "Clarifies requirements and scale before designing",
    "Designs a clear API and data model",
    "Chooses storage and data flow, with reasons",
    "Plans for load, failure and growth",
    "Explains trade-offs clearly",
  ],
  tools: {
    allowed: ["Public documentation", "AI assistants, with the prompts used pasted into the submission"],
    notAllowed: ["Help from another person"],
  },
  sampleTask: {
    title: "Design a ticket booking API",
    brief: "Design the backend for booking seats at events, where thousands of people try to book the same show when sales open. Describe the API, how you store seats and bookings, and how you stop two people booking the same seat.",
  },
  prep: "system-design",
  role: "Backend engineer",
  minutes: 60,
  submission: "written_file",
  runnable: false,
};

/** Every Klymb-written item, in the order the catalog lists them. */
export const CODE_ITEMS: readonly CodeItem[] = [systemDesign, systemDesignBaseline, backendDesignPractical];

export const codeItem = (slug: string): CodeItem | undefined => CODE_ITEMS.find((i) => i.slug === slug);
