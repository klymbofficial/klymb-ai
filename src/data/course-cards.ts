/**
 * The course library at /courses: every card it shows, in order, and what
 * each card says beyond the catalog (src/data/catalog.ts).
 *
 * Featured, in this order: the Claude Challenge, Agentic AI Systems, the
 * 31 Days AI Cohort and System Design. The Claude Challenge and the AI Cohort
 * are free and not in the catalog yet, and Agentic AI Systems is a course app
 * of its own (/courses/agentic-ai), so all three are listed here; only this
 * page reads them.
 *
 * PLACEHOLDERS (decided 2026-11-14, to be replaced with real numbers): every
 * `rating`, `reviews` and `learners` value, and the `hours` of the Claude
 * Challenge and the AI Cohort, are invented so the cards are not empty.
 * Agentic AI Systems has none of them: its length is read off its modules,
 * and it shows no rating until there is a real one. There
 * is no instructor line: only real, consenting people may be named
 * (src/data/designers.ts). The featured cards' art is drawn in
 * src/components/catalog/CourseArt.tsx; `glyph` is the art for the rest.
 */
import { programs, type IndustrySlug, type Program, type RoleSlug } from "@/data/catalog";
import { MODULES } from "@/data/system-design/course-app";
import { getTrack, isFree } from "@/data/tracks";

export type Level = "Beginner" | "Intermediate" | "Advanced";

/** The art ground and the colour of the big letters on it. */
export type Tint = "clay" | "violet" | "green" | "blue" | "amber" | "rose" | "slate";

export interface CardDetails {
  level: Level;
  hours: number;
  /** What `lessons` counts, when it is not lessons. */
  unit?: "lessons" | "modules";
  lessons: number;
  /** The three together: the rating row shows only when there is a real one. */
  rating?: number;
  reviews?: number;
  learners?: number;
}

export interface LibraryCourse {
  slug: string;
  name: string;
  /** Searched, not shown: "60-day challenge", "Short video course" and so on. */
  kind: string;
  summary: string;
  /** The pill on the art. */
  category: string;
  /** A second pill beside it, for a course that has just opened. */
  badge?: string;
  glyph: string;
  tint: Tint;
  roles: RoleSlug[];
  industries: IndustrySlug[];
  open: boolean;
  free: boolean;
  /** Where the card goes. Null when there is no page for the course yet. */
  href: string | null;
  /** Level, length and the rating row. Null for a program that is not available. */
  card: CardDetails | null;
}

const SD_LESSONS = MODULES.reduce((n, m) => n + m.lessons.length, 0);

/**
 * Not in the catalog yet. The Claude Challenge's page is /challenges/claude,
 * which comes with branch claude/klymb-ux-flow-audit-377d4b. The AI Cohort's
 * page is /courses/ai-cohort.
 */
const claude: LibraryCourse = {
  slug: "claude",
  name: "Claude Challenge",
  kind: "60-day challenge",
  summary: "Master Claude AI in 60 days: one scoped task a day, shipped in public.",
  category: "AI",
  glyph: "C",
  tint: "clay",
  roles: [],
  industries: ["any-industry"],
  open: true,
  free: true,
  href: "/challenges/claude",
  card: { level: "Beginner", hours: 60, lessons: 60, rating: 4.8, reviews: 2140, learners: 12400 },
};

/**
 * Agentic AI Systems is read by its own app (src/data/courses/agentic-ai), whose
 * modules are far too large to ship in this page's bundle, so its shape is
 * written here: 8 modules of 22, 28, 30, 28, 30, 30, 32 and 35 minutes, 235
 * in all, which is about 4 hours. Change it when the modules change.
 */
const agenticAi: LibraryCourse = {
  slug: "agentic-ai",
  name: "Agentic AI Systems",
  kind: "Self-paced course",
  summary: "Design, build and ship AI agents that actually work: the agent loop, tools, workflows, memory and reliability.",
  category: "AI",
  badge: "New",
  glyph: "AG",
  tint: "blue",
  roles: ["software-engineering"],
  industries: ["any-industry"],
  open: true,
  free: false,
  href: "/courses/agentic-ai",
  card: { level: "Intermediate", hours: 4, unit: "modules", lessons: 8 },
};

const aiCohort: LibraryCourse = {
  slug: "ai-cohort",
  name: "31 Days AI Cohort",
  kind: "31-day cohort",
  summary: "Build and deploy a production-grade AI chatbot in 31 days: RAG, agents, MCP and deploy.",
  category: "AI",
  glyph: "AI",
  tint: "violet",
  roles: [],
  industries: ["any-industry"],
  open: true,
  free: true,
  href: "/courses/ai-cohort",
  card: { level: "Intermediate", hours: 40, lessons: 31, rating: 4.7, reviews: 1380, learners: 8900 },
};

/** Featured, in the order shown. */
export const FEATURED = ["claude", "agentic-ai", "ai-cohort", "system-design"];

/** Per catalog program: what the catalog does not say. */
const extra: Record<string, Pick<LibraryCourse, "category" | "glyph" | "tint"> & { card?: Omit<CardDetails, "hours" | "lessons"> & Partial<CardDetails> }> = {
  "system-design": { category: "Development", glyph: "SD", tint: "green", card: { level: "Intermediate", hours: 5, lessons: SD_LESSONS, rating: 4.9, reviews: 640, learners: 3200 } },
  "qa-engineer": { category: "Testing", glyph: "QA", tint: "blue", card: { level: "Intermediate", rating: 4.7, reviews: 410, learners: 2600 } },
  "l1-l2-support": { category: "Operations", glyph: "L1", tint: "amber", card: { level: "Beginner", rating: 4.6, reviews: 320, learners: 2100 } },
  "project-manager": { category: "Management", glyph: "PM", tint: "rose", card: { level: "Intermediate", rating: 4.7, reviews: 280, learners: 1800 } },
  "junior-developer": { category: "Development", glyph: "JD", tint: "blue", card: { level: "Beginner", rating: 4.8, reviews: 530, learners: 3400 } },
  "reporting-analyst": { category: "Analytics", glyph: "RA", tint: "green", card: { level: "Beginner", rating: 4.6, reviews: 240, learners: 1500 } },
  "ai-in-healthcare": { category: "Healthcare", glyph: "AH", tint: "slate" },
  "ai-in-insurance": { category: "Insurance", glyph: "AI", tint: "slate" },
  "ai-in-banking": { category: "Banking", glyph: "AB", tint: "slate" },
  cybersecurity: { category: "Security", glyph: "CS", tint: "slate" },
  "red-teaming": { category: "Security", glyph: "RT", tint: "slate" },
};

/** A 30-day career track: 30 lessons at 1–2 hours a day. */
const TRACK_SHAPE = { hours: 45, lessons: 30 };

function fromProgram(p: Program): LibraryCourse {
  const open = p.status === "available";
  const x = extra[p.slug] ?? { category: p.kind, glyph: p.name.slice(0, 2), tint: "slate" as const };
  const track = p.track ? getTrack(p.track) : undefined;
  return {
    slug: p.slug,
    name: p.name,
    kind: p.kind,
    summary: p.summary,
    category: x.category,
    glyph: x.glyph,
    tint: x.tint,
    roles: p.roles,
    industries: p.industries,
    open,
    free: !!track && isFree(track),
    href: `/courses/${p.slug}`,
    card: open && x.card ? { ...TRACK_SHAPE, ...x.card } : null,
  };
}

/** Every card the library can show: the featured ones first, then the rest in catalog order. */
export const libraryCourses: LibraryCourse[] = [claude, agenticAi, aiCohort, ...programs.map(fromProgram)];
