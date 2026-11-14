/**
 * Profile strength: how complete a learner's profile is, out of 100, and what
 * is still worth adding. A guide for the learner, nothing more: it gates
 * nothing. Weights sum to 100.
 */

export interface Profile {
  name: string;
  headline: string;
  phone: string;
  city: string;
  status: "student" | "working" | "";
  institution: string;
  degree: string;
  graduationYear: number | null;
  noExperience: boolean;
  jobRole: string;
  company: string;
  skills: string[];
  githubUsername: string;
  linkedinSlug: string;
  portfolioUrl: string;
}

export const EMPTY_PROFILE: Profile = {
  name: "", headline: "", phone: "", city: "", status: "", institution: "", degree: "", graduationYear: null,
  noExperience: false, jobRole: "", company: "", skills: [], githubUsername: "", linkedinSlug: "", portfolioUrl: "",
};

export interface ProfileSection {
  key: "about" | "education" | "experience" | "skills" | "links";
  label: string;
  earned: number;
  weight: number;
  /** What would earn the rest, named the way the form names it, most valuable first. */
  missing: string[];
}

export interface ProfileScore {
  score: number;
  /** 70 or more, with every essential in: who they are, how to reach them, where, what they can do, and a history. */
  ready: boolean;
  /** Every section's missing items, most valuable first: the "still to add" list. */
  missing: string[];
  sections: ProfileSection[];
}

/** The bar for "ready". */
export const PROFILE_READY_SCORE = 70;

const filled = (s: string) => s.trim().length > 0;

/** A part of a section: its points, and whether it is in. */
type Part = [label: string, points: number, met: boolean];

function section(key: ProfileSection["key"], label: string, parts: Part[]): ProfileSection & { gaps: Part[] } {
  const gaps = parts.filter(([, , met]) => !met).sort((a, b) => b[1] - a[1]);
  return {
    key,
    label,
    weight: parts.reduce((n, [, p]) => n + p, 0),
    earned: parts.reduce((n, [, p, met]) => n + (met ? p : 0), 0),
    missing: gaps.map(([l]) => l),
    gaps,
  };
}

export function scoreProfile(p: Profile, { hasPhoto }: { hasPhoto: boolean }): ProfileScore {
  const skills = new Set(p.skills.map((s) => s.trim().toLowerCase()).filter(Boolean)).size;
  const experience = p.noExperience || (filled(p.jobRole) && filled(p.company));
  const sections = [
    section("about", "About you", [
      ["Full name", 5, filled(p.name)],
      ["Phone number", 10, /^\+?\d{10,15}$/.test(p.phone.replace(/[\s()-]/g, ""))],
      ["Current city", 5, filled(p.city)],
      ["Headline", 10, filled(p.headline)],
      ["Profile photo", 5, hasPhoto],
    ]),
    section("education", "Education", [
      ["College or school", 8, filled(p.institution)],
      ["Degree", 6, filled(p.degree)],
      ["Graduation year", 6, p.graduationYear != null],
    ]),
    section("experience", "Experience", [["Your work history, or that you have none yet", 15, experience]]),
    // Five points a skill up to three, named as one item: "2 more skills".
    section("skills", "Skills", [[skills === 2 ? "1 more skill" : `${3 - Math.min(3, skills)} more skills`, 15 - 5 * Math.min(3, skills), skills >= 3], ["", 5 * Math.min(3, skills), true]]),
    section("links", "Links", [
      ["GitHub", 5, filled(p.githubUsername)],
      ["LinkedIn", 5, filled(p.linkedinSlug)],
      ["Portfolio or résumé link", 5, filled(p.portfolioUrl)],
    ]),
  ];
  const score = Math.min(100, sections.reduce((n, s) => n + s.earned, 0));
  const essentials = filled(p.name) && filled(p.headline) && filled(p.city) && skills >= 3 &&
    /^\+?\d{10,15}$/.test(p.phone.replace(/[\s()-]/g, "")) && (filled(p.institution) || experience);
  return {
    score,
    ready: score >= PROFILE_READY_SCORE && essentials,
    missing: sections.flatMap((s) => s.gaps).sort((a, b) => b[1] - a[1]).map(([l]) => l),
    sections: sections.map(({ gaps, ...s }) => { void gaps; return s; }),
  };
}
