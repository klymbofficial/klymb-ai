import { HIDE_MONEY } from "@/lib/site-status";
import type { MetadataRoute } from "next";
import { availablePrograms, industries, roles } from "@/data/catalog";
import { site } from "@/data/config";
import { challenges, tracks } from "@/data/tracks";

/** Every public page. Signed-in areas are deliberately absent. */
export default function sitemap(): MetadataRoute.Sitemap {
  const page = (path: string, priority: number, changeFrequency: "weekly" | "monthly" | "yearly") => ({
    url: `${site.url}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  });

  return [
    page("", 1, "weekly"),
    page("/program", 0.8, "monthly"),
    page("/tracks", 0.8, "monthly"),
    ...tracks.map((t) => page(`/tracks/${t.slug}`, t.available ? 0.9 : 0.6, "monthly")),
    page("/courses", 0.8, "monthly"),
    ...roles.map((r) => page(`/courses/roles/${r.slug}`, 0.5, "monthly")),
    ...industries.map((i) => page(`/courses/industries/${i.slug}`, 0.5, "monthly")),
    // Only programs you can take; the ones not built are kept out of search.
    ...availablePrograms.map((p) => page(`/courses/${p.slug}`, 0.6, "monthly")),
    page("/training-solutions", 0.5, "monthly"),
    page("/challenges", 0.8, "monthly"),
    page("/courses/agentic-ai", 0.8, "monthly"),
    page("/hackathons", 0.7, "weekly"),
    ...challenges.map((c) => page(`/challenges/${c.slug}`, 0.8, "monthly")),
    page("/system-design", 0.9, "weekly"),
    page("/learn/system-design", 0.8, "weekly"),
    page("/register", 0.9, "weekly"),
    page("/why-klymb", 0.7, "monthly"),
    page("/about", 0.6, "monthly"),
    page("/organizations", 0.7, "monthly"),
    page("/contact", 0.4, "yearly"),
    page("/privacy", 0.2, "yearly"),
    page("/terms", 0.2, "yearly"),
    ...(HIDE_MONEY ? [] : [page("/refund-policy", 0.3, "yearly")]),
    page("/cookies", 0.2, "yearly"),
  ];
}
