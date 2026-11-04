/**
 * app.klymb.ai's own programs, shown as cards on the klymb.ai dashboard. They
 * run on app.klymb.ai, which this app cannot read, so this list is kept by
 * hand: when a program opens, closes or changes its date there, change it
 * here. Titles and lines are app.klymb.ai's own wording.
 */
import type { PlatformDomain } from "@/lib/platform-summary";

export interface PlatformProgram {
  title: string;
  /** For a 60-day challenge: how app.klymb.ai's summary names it, so the card can show their progress. */
  domain?: PlatformDomain;
  /** The hackathon card, which shows their registration. */
  hackathon?: boolean;
  kind: string;
  line: string;
  /** Path on app.klymb.ai. */
  path: string;
  /** A date or status worth showing on the card. Kept by hand. */
  note?: string;
}

export const platformPrograms: PlatformProgram[] = [
  { title: "Agentic AI Systems", kind: "Course · 8 modules", line: "Design, build and ship AI agents that actually work.", path: "/learn/agentic-ai" },
  { title: "Claude Challenge", domain: "CLAUDE", kind: "60-day challenge", line: "Master Claude AI in 60 days: one scoped task a day, shipped in public.", path: "/claude", note: "Next one starts 15 November 2026" },
  { title: "Artificial Intelligence", domain: "AI", kind: "60-day track", line: "Build with models, agents and data.", path: "/ai" },
  { title: "Software Engineering", domain: "SE", kind: "60-day track", line: "Ship real software, one task a day.", path: "/se" },
  { title: "Data Science", domain: "DS", kind: "60-day track", line: "Turn raw data into real insight.", path: "/ds" },
  { title: "Hackathons", hackathon: true, kind: "Weekend builds", line: "48 hours. No boilerplate. Just you, your ideas, and AI.", path: "/hackathon" },
];

/** A program's address, tagged so app.klymb.ai's analytics see the visit came from the dashboard. */
export function platformLink(path: string) {
  return `https://app.klymb.ai${path}?utm_source=klymb.ai&utm_medium=referral&utm_campaign=klymb-dashboard`;
}
