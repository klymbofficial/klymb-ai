import "server-only";
import { db } from "@/lib/db/client";
import { EMPTY_PROFILE, type Profile } from "@/lib/profile-score";
import { normaliseLinkedinSlug } from "@/lib/learner/evidence";

/** Postgres: no such table. Code can go live before its migration. */
const UNDEFINED_TABLE = "42P01";

type Row = {
  name: string | null; headline: string | null; phone: string | null; city: string | null; status: "student" | "working" | null;
  institution: string | null; degree: string | null; graduation_year: number | null; no_experience: boolean;
  job_role: string | null; company: string | null; skills: string[]; github_username: string | null; linkedin_slug: string | null; portfolio_url: string | null;
};

const fromRow = (r: Row): Profile => ({
  name: r.name ?? "", headline: r.headline ?? "", phone: r.phone ?? "", city: r.city ?? "", status: r.status ?? "",
  institution: r.institution ?? "", degree: r.degree ?? "", graduationYear: r.graduation_year, noExperience: r.no_experience,
  jobRole: r.job_role ?? "", company: r.company ?? "", skills: r.skills ?? [], githubUsername: r.github_username ?? "",
  linkedinSlug: r.linkedin_slug ?? "", portfolioUrl: r.portfolio_url ?? "",
});

/**
 * This person's profile. Before they have saved one, it starts from what
 * klymb.ai already knows about them: their name, phone, student or working,
 * and the GitHub and LinkedIn from a track or the System Design form.
 * `saved` says which it is.
 */
export async function readProfile(email: string, sessionName?: string | null): Promise<{ profile: Profile; saved: boolean }> {
  const sql = db();
  if (!sql) return { profile: { ...EMPTY_PROFILE, name: sessionName ?? "" }, saved: false };
  const { data, error } = await sql.row<Row>`
    select name, headline, phone, city, status, institution, degree, graduation_year, no_experience,
           job_role, company, skills, github_username, linkedin_slug, portfolio_url
      from course.profiles where email = ${email}
  `;
  if (data) return { profile: fromRow(data), saved: true };
  if (error && error.code !== UNDEFINED_TABLE) console.error("profile read failed:", error.code);

  const [learner, lead, reg] = await Promise.all([
    sql.row<{ name: string; github_username: string | null; linkedin_slug: string | null }>`
      select name, github_username, linkedin_slug from course.learners where email = ${email} order by created_at desc limit 1
    `,
    sql.row<{ name: string; phone: string; status: "student" | "working"; linkedin: string | null }>`
      select name, phone, status, linkedin from course.sd_preregistrations where email = ${email}
    `,
    sql.row<{ name: string; phone: string; linkedin: string | null }>`
      select name, phone, linkedin from course.registrations where email = ${email} order by created_at desc limit 1
    `,
  ]);
  const l = learner.data, s = lead.data, r = reg.data;
  const linkedinFrom = (url: string | null | undefined) => (url ? normaliseLinkedinSlug(url) ?? "" : "");
  return {
    saved: false,
    profile: {
      ...EMPTY_PROFILE,
      name: l?.name || r?.name || s?.name || sessionName || "",
      phone: (r?.phone || s?.phone || "").replace(/[\s()-]/g, ""),
      status: s?.status ?? "",
      githubUsername: l?.github_username ?? "",
      linkedinSlug: l?.linkedin_slug || linkedinFrom(r?.linkedin) || linkedinFrom(s?.linkedin),
    },
  };
}

/** Saves the whole profile. False when it could not be saved. */
export async function saveProfile(email: string, p: Profile): Promise<boolean> {
  const sql = db();
  if (!sql) return false;
  const nul = (s: string) => s || null;
  const { error } = await sql.run`
    insert into course.profiles (email, name, headline, phone, city, status, institution, degree, graduation_year,
      no_experience, job_role, company, skills, github_username, linkedin_slug, portfolio_url, updated_at)
    values (${email}, ${nul(p.name)}, ${nul(p.headline)}, ${nul(p.phone)}, ${nul(p.city)}, ${nul(p.status)}, ${nul(p.institution)},
      ${nul(p.degree)}, ${p.graduationYear}, ${p.noExperience}, ${nul(p.jobRole)}, ${nul(p.company)}, ${p.skills}::text[],
      ${nul(p.githubUsername)}, ${nul(p.linkedinSlug)}, ${nul(p.portfolioUrl)}, now())
    on conflict (email) do update set
      name = excluded.name, headline = excluded.headline, phone = excluded.phone, city = excluded.city, status = excluded.status,
      institution = excluded.institution, degree = excluded.degree, graduation_year = excluded.graduation_year,
      no_experience = excluded.no_experience, job_role = excluded.job_role, company = excluded.company, skills = excluded.skills,
      github_username = excluded.github_username, linkedin_slug = excluded.linkedin_slug, portfolio_url = excluded.portfolio_url,
      updated_at = now()
  `;
  if (error) {
    if (error.code !== UNDEFINED_TABLE) console.error("profile save failed:", error.code);
    return false;
  }
  return true;
}
