import type { Metadata } from "next";
import { CohortPage } from "@/components/cohort/CohortPage";
import { libraryCourses } from "@/data/course-cards";

/**
 * A static route, like /courses/agentic-ai: /courses/[slug] is the catalogue's
 * program page, and a static segment wins over the dynamic one beside it.
 */
export const metadata: Metadata = {
  title: "31 Days AI Cohort",
  description: "Build and deploy a production-grade AI chatbot in 31 days: RAG, agents, MCP and deploy.",
};

export default function AiCohortPage() {
  // Level, hours, lessons and rating come from the course's card, the one /courses shows.
  const facts = libraryCourses.find((c) => c.slug === "ai-cohort")?.card ?? null;
  return <CohortPage facts={facts} />;
}
