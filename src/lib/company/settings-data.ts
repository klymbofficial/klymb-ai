import type { Db } from "@/lib/db/client";
import type { CompanyDetails, CompanySwitch, Language, Profile } from "@/lib/company/settings-rules";

/**
 * The Settings page's reads and writes (0098). Every query is scoped to the
 * company and email the caller took from the signed-in member, never from a
 * form. A failed read is null (the page says it can't load); a failed write
 * is false. Kept free of server-only wiring so it can run against a real
 * Postgres in tests.
 */

const UNDEFINED_COLUMN = "42703";
const UNDEFINED_TABLE = "42P01";

export interface MyProfile extends Profile {
  email: string;
  accountUpdates: boolean;
}

export async function loadMyProfile(sql: Pick<Db, "row">, companyId: string, email: string): Promise<MyProfile | null> {
  const { data, error } = await sql.row<{ name: string | null; job_title: string | null; phone: string | null; time_zone: string; language: Language; account_updates: boolean }>`
    select name, job_title, phone, time_zone, language, account_updates
      from course.company_members
     where company_id = ${companyId}::uuid and email = ${email} and removed_at is null
  `;
  if (error || !data) return null;
  return {
    email,
    name: data.name ?? "",
    jobTitle: data.job_title,
    phone: data.phone,
    timeZone: data.time_zone,
    language: data.language,
    accountUpdates: data.account_updates,
  };
}

export async function saveMyProfile(sql: Pick<Db, "run">, companyId: string, email: string, p: Profile): Promise<boolean> {
  const { data, error } = await sql.run`
    update course.company_members
       set name = ${p.name}, job_title = ${p.jobTitle}, phone = ${p.phone}, time_zone = ${p.timeZone}, language = ${p.language}
     where company_id = ${companyId}::uuid and email = ${email} and removed_at is null
  `;
  return !error && data === 1;
}

export async function saveAccountUpdates(sql: Pick<Db, "run">, companyId: string, email: string, on: boolean): Promise<boolean> {
  const { data, error } = await sql.run`
    update course.company_members set account_updates = ${on}
     where company_id = ${companyId}::uuid and email = ${email} and removed_at is null
  `;
  return !error && data === 1;
}

export interface CompanySettings extends CompanyDetails {
  name: string;
  hide_candidate_names: boolean;
  eeo_survey: boolean;
  /** 0101: reviewers may ask AI to suggest scores for written answers. False before the migration. */
  ai_review_suggestions: boolean;
}

export async function loadCompanySettings(sql: Pick<Db, "row">, companyId: string): Promise<CompanySettings | null> {
  const { data, error } = await sql.row<{ name: string; contact_phone: string | null; website: string | null; address: string | null; hide_candidate_names: boolean; eeo_survey: boolean }>`
    select name, contact_phone, website, address, hide_candidate_names, eeo_survey from course.companies where id = ${companyId}::uuid
  `;
  if (error || !data) return null;
  // On its own, so the page still loads before 0101: the switch then reads as off.
  const ai = await sql.row<{ on: boolean }>`select ai_review_suggestions as on from course.companies where id = ${companyId}::uuid`;
  return { name: data.name, phone: data.contact_phone, website: data.website, address: data.address, hide_candidate_names: data.hide_candidate_names, eeo_survey: data.eeo_survey, ai_review_suggestions: !ai.error && !!ai.data?.on };
}

export async function saveCompanyDetails(sql: Pick<Db, "run">, companyId: string, d: CompanyDetails): Promise<boolean> {
  const { data, error } = await sql.run`
    update course.companies set contact_phone = ${d.phone}, website = ${d.website}, address = ${d.address} where id = ${companyId}::uuid
  `;
  return !error && data === 1;
}

/** One of the whitelisted switches; the column name never comes from the form (isCompanySwitch checks it first). */
export async function saveCompanySwitch(sql: Pick<Db, "run">, companyId: string, key: CompanySwitch, on: boolean): Promise<boolean> {
  const { data, error } = key === "hide_candidate_names"
    ? await sql.run`update course.companies set hide_candidate_names = ${on} where id = ${companyId}::uuid`
    : key === "eeo_survey"
      ? await sql.run`update course.companies set eeo_survey = ${on} where id = ${companyId}::uuid`
      : await sql.run`update course.companies set ai_review_suggestions = ${on} where id = ${companyId}::uuid`;
  return !error && data === 1;
}

export interface PlanUsage {
  seats: number;
  members: number;
  admins: number;
  teams: number;
  /** People invited to external tests (not cancelled), who started and who submitted. */
  invited: number;
  started: number;
  submitted: number;
  tests: number;
}

export async function loadPlanUsage(sql: Pick<Db, "row">, companyId: string): Promise<PlanUsage | null> {
  const { data, error } = await sql.row<PlanUsage>`
    select c.seat_count as seats,
           (select count(*)::int from course.company_members m where m.company_id = c.id and m.removed_at is null) as members,
           (select count(distinct r.email)::int from course.company_member_roles r
              join course.company_members m on m.company_id = r.company_id and m.email = r.email and m.removed_at is null
             where r.company_id = c.id and r.role = 'admin') as admins,
           (select count(*)::int from course.teams t where t.company_id = c.id) as teams,
           (select count(*)::int from course.batch_candidates bc join course.hiring_batches b on b.id = bc.batch_id and b.company_id = bc.company_id
             where bc.company_id = c.id and b.purpose = 'hiring' and b.status <> 'draft' and bc.status = 'active') as invited,
           (select count(*)::int from course.candidate_attempts a join course.hiring_batches b on b.id = a.batch_id
             where a.company_id = c.id and b.purpose = 'hiring') as started,
           (select count(*)::int from course.candidate_attempts a join course.hiring_batches b on b.id = a.batch_id
             where a.company_id = c.id and b.purpose = 'hiring' and a.submitted_at is not null) as submitted,
           (select count(distinct b.item)::int from course.hiring_batches b where b.company_id = c.id and b.status <> 'draft') as tests
      from course.companies c where c.id = ${companyId}::uuid
  `;
  if (error || !data) return null;
  return data;
}

/** The person's "log out from other sessions" cut-off, or null for none. Undefined when it can't be read (fail closed). */
export async function sessionCutoff(sql: Pick<Db, "row">, email: string): Promise<{ before: Date; keepSid: string | null } | null | undefined> {
  const { data, error } = await sql.row<{ signed_out_before: Date | string; keep_sid: string | null }>`
    select signed_out_before, keep_sid from course.company_session_cutoffs where email = ${email}
  `;
  // Before 0098 there is no cut-off to apply.
  if (error) return error.code === UNDEFINED_TABLE || error.code === UNDEFINED_COLUMN ? null : undefined;
  return data ? { before: new Date(data.signed_out_before), keepSid: data.keep_sid } : null;
}

/** Signs out every other company session of this person: anything signed in before now, except `keepSid`. */
export async function signOutOthers(sql: Pick<Db, "run">, email: string, keepSid: string): Promise<boolean> {
  const { error } = await sql.run`
    insert into course.company_session_cutoffs (email, signed_out_before, keep_sid, updated_at)
    values (${email}, now(), ${keepSid}, now())
    on conflict (email) do update set signed_out_before = now(), keep_sid = excluded.keep_sid, updated_at = now()
  `;
  return !error;
}

/** Whether this company lets reviewers ask AI for suggested scores (0101). False when it can't be read, or before the migration. */
export async function aiReviewOn(sql: Pick<Db, "row">, companyId: string): Promise<boolean> {
  const { data, error } = await sql.row<{ on: boolean }>`select ai_review_suggestions as on from course.companies where id = ${companyId}::uuid`;
  return !error && !!data?.on;
}
