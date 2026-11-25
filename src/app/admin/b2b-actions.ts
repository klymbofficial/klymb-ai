"use server";

import { revalidatePath } from "next/cache";
import { addFirstHr } from "@/app/admin/company-actions";
import { isOwnerEmail, isSalesManager } from "@/lib/admin/access";
import { getSalesAdmin, type AdminSession } from "@/lib/admin/auth";
import { logAdmin } from "@/lib/admin/audit";
import { companySlug } from "@/lib/admin/companies";
import {
  ACTIVITY_KINDS, B2B_SOURCES, BUYING_ROLES, cleanGstin, cleanUrl, COMPANY_WIDE_DOCS, dealValue, DEFAULT_DOCS, DELIVERY_MODES,
  EMPLOYEE_SIZES, isB2BStage, isDocKind, isDocStatus, isOneOf, isOpenStage, LOST_REASONS, PAYMENT_STATUSES, PAYMENT_TERMS, signBlocked,
} from "@/lib/b2b";
import { db } from "@/lib/db/client";
import { normaliseEmail } from "@/lib/email";
import { istToday, normalisePhone } from "@/lib/sales";

export type B2BResult = { ok: true; id?: string; message?: string } | { ok: false; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Failure = { ok: false; message: string };
const NOT_ALLOWED: Failure = { ok: false, message: "Not authorised." };
const UNAVAILABLE: Failure = { ok: false, message: "Unavailable right now." };
const FAILED: Failure = { ok: false, message: "That could not be saved." };
const NO_TABLES = "Run db/migrations/0069_b2b_deals.sql in Neon first.";

const text = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const date = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
const whole = (v: unknown, max: number) => {
  const n = Math.floor(Number(String(v ?? "").replace(/[,\s₹]/g, "")));
  return Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : 0;
};
const fail = (code: string | undefined, fallback: Failure = FAILED): Failure =>
  code === "42P01" ? { ok: false, message: NO_TABLES } : fallback;

/** Owners and sales managers. */
async function seller(): Promise<AdminSession | null> {
  return getSalesAdmin();
}

/** Someone a deal can be given to: an owner or a sales manager. */
const canOwn = (email: string | null) => email !== null && (isOwnerEmail(email) || isSalesManager(email));

function refresh() {
  revalidatePath("/admin/sales/b2b", "layout");
  revalidatePath("/admin/sales");
}

// ── Companies and contacts ──────────────────────────────────

export interface CompanyInput {
  name: string; industry: string; employees: string; city: string; website: string; linkedin: string;
  gstin: string; billing_address: string; notes: string;
}

function cleanCompany(c: CompanyInput) {
  const name = text(c.name, 160);
  if (!name) return { error: "Add the company name." } as const;
  const gstin = cleanGstin(c.gstin);
  if (gstin === false) return { error: "That GSTIN doesn't look right. It has 15 characters, like 09AAACM1234A1Z5." } as const;
  const website = c.website.trim() ? cleanUrl(c.website) : null;
  if (c.website.trim() && !website) return { error: "That website doesn't look right." } as const;
  const linkedin = c.linkedin.trim() ? cleanUrl(c.linkedin) : null;
  if (c.linkedin.trim() && !linkedin) return { error: "That LinkedIn link doesn't look right." } as const;
  return {
    value: {
      name, gstin, website: website?.slice(0, 300) ?? null, linkedin: linkedin?.slice(0, 300) ?? null,
      industry: text(c.industry, 80), city: text(c.city, 80),
      employees: (EMPLOYEE_SIZES as readonly string[]).includes(c.employees) ? c.employees : null,
      billing_address: text(c.billing_address, 500), notes: text(c.notes, 2000),
    },
  } as const;
}

export async function saveCompany(id: string | null, input: CompanyInput): Promise<B2BResult> {
  const admin = await seller();
  if (!admin) return NOT_ALLOWED;
  if (id !== null && !UUID.test(id)) return { ok: false, message: "That company no longer exists." };
  const c = cleanCompany(input);
  if ("error" in c) return { ok: false, message: c.error! };
  const sql = db();
  if (!sql) return UNAVAILABLE;
  const v = c.value;
  const dup = { ok: false, message: `${v.name} is already in Companies. Open it from there.` } as const;
  if (id === null) {
    const { data, error } = await sql.row<{ id: string }>`
      insert into course.b2b_companies (name, industry, employees, city, website, linkedin, gstin, billing_address, notes, created_by)
      values (${v.name}, ${v.industry}, ${v.employees}, ${v.city}, ${v.website}, ${v.linkedin}, ${v.gstin}, ${v.billing_address}, ${v.notes}, ${admin.email})
      returning id`;
    if (error || !data) return error?.code === "23505" ? dup : fail(error?.code);
    refresh();
    return { ok: true, id: data.id };
  }
  const { data, error } = await sql.run`
    update course.b2b_companies set name = ${v.name}, industry = ${v.industry}, employees = ${v.employees}, city = ${v.city},
      website = ${v.website}, linkedin = ${v.linkedin}, gstin = ${v.gstin}, billing_address = ${v.billing_address},
      notes = ${v.notes}, updated_at = now()
    where id = ${id}`;
  if (error) return error.code === "23505" ? dup : fail(error.code);
  if (!data) return { ok: false, message: "That company no longer exists." };
  refresh();
  return { ok: true, id };
}

export interface ContactInput {
  name: string; designation: string; buying_role: string; email: string; phone: string; linkedin: string; is_primary: boolean;
}

function cleanContact(c: ContactInput) {
  const name = text(c.name, 120);
  if (!name) return { error: "Add the person's name." } as const;
  const email = c.email.trim() ? normaliseEmail(c.email) : null;
  if (c.email.trim() && !email) return { error: "That email doesn't look right." } as const;
  const phone = c.phone.trim() ? normalisePhone(c.phone) : null;
  if (c.phone.trim() && !phone) return { error: "That phone number doesn't look right." } as const;
  const linkedin = c.linkedin.trim() ? cleanUrl(c.linkedin) : null;
  if (c.linkedin.trim() && !linkedin) return { error: "That LinkedIn link doesn't look right." } as const;
  return {
    value: {
      name, email, phone, linkedin: linkedin?.slice(0, 300) ?? null, designation: text(c.designation, 120),
      buying_role: isOneOf(BUYING_ROLES, c.buying_role) ? c.buying_role : "other", is_primary: !!c.is_primary,
    },
  } as const;
}

/** Adds a person (id null) or edits one. Making someone the main contact moves the mark off the last one. */
export async function saveContact(companyId: string, id: string | null, input: ContactInput): Promise<B2BResult> {
  if (!(await seller())) return NOT_ALLOWED;
  if (!UUID.test(companyId) || (id !== null && !UUID.test(id))) return { ok: false, message: "That company no longer exists." };
  const c = cleanContact(input);
  if ("error" in c) return { ok: false, message: c.error! };
  const sql = db();
  if (!sql) return UNAVAILABLE;
  const v = c.value;
  // The first person added is the main contact.
  const { data: count } = await sql.scalar<number>`select count(*)::int from course.b2b_contacts where company_id = ${companyId} and is_primary`;
  const primary = v.is_primary || !count;
  if (primary) {
    const { error } = await sql.run`update course.b2b_contacts set is_primary = false where company_id = ${companyId} and is_primary and id is distinct from ${id}::uuid`;
    if (error) return fail(error.code);
  }
  const result = id === null
    ? await sql.row<{ id: string }>`
        insert into course.b2b_contacts (company_id, name, designation, buying_role, email, phone, linkedin, is_primary)
        values (${companyId}, ${v.name}, ${v.designation}, ${v.buying_role}, ${v.email}, ${v.phone}, ${v.linkedin}, ${primary})
        returning id`
    : await sql.row<{ id: string }>`
        update course.b2b_contacts set name = ${v.name}, designation = ${v.designation}, buying_role = ${v.buying_role},
          email = ${v.email}, phone = ${v.phone}, linkedin = ${v.linkedin}, is_primary = ${primary}
        where id = ${id} and company_id = ${companyId} returning id`;
  if (result.error) return fail(result.error.code, result.error.code === "23503" ? { ok: false, message: "That company no longer exists." } : FAILED);
  if (!result.data) return { ok: false, message: "That person is no longer here." };
  refresh();
  return { ok: true, id: result.data.id };
}

export async function deleteContact(id: string): Promise<B2BResult> {
  if (!(await seller())) return NOT_ALLOWED;
  if (!UUID.test(id)) return { ok: false, message: "That person is no longer here." };
  const sql = db();
  if (!sql) return UNAVAILABLE;
  const { error } = await sql.run`delete from course.b2b_contacts where id = ${id}`;
  if (error) return fail(error.code);
  refresh();
  return { ok: true };
}

// ── Deals ───────────────────────────────────────────────────

export interface DealInput {
  title: string; owner_email: string; source: string; courses: string;
  seats: string; price_per_seat: string; discount_inr: string; value_inr: string;
  payment_terms: string; payment_status: string; po_number: string; delivery_mode: string;
  expected_close: string; cohort_start: string; renewal_date: string;
  next_step: string; next_step_date: string; status_note: string; notes: string;
}

function cleanDeal(d: DealInput, open: boolean) {
  const title = text(d.title, 160);
  if (!title) return { error: "Give the deal a name, like \"System Design for 40 engineers\"." } as const;
  const owner = normaliseEmail(d.owner_email);
  if (d.owner_email.trim() && !canOwn(owner)) return { error: "Deals can only be given to an owner or a sales manager." } as const;
  const next_step = text(d.next_step, 200);
  const next_step_date = date(d.next_step_date);
  // Every open deal keeps a next step with a date, so none is forgotten.
  if (open && (!next_step || !next_step_date)) return { error: "Add the next step and its date." } as const;
  const seats = whole(d.seats, 100000);
  const price = d.price_per_seat.trim() ? whole(d.price_per_seat, 10_000_000) : null;
  const discount = whole(d.discount_inr, 1_000_000_000);
  return {
    value: {
      title, owner_email: owner, next_step, next_step_date, seats, price_per_seat: price, discount_inr: discount,
      value_inr: dealValue({ seats, pricePerSeat: price, discount, typed: whole(d.value_inr, 1_000_000_000) }),
      source: isOneOf(B2B_SOURCES, d.source) ? d.source : "outbound",
      courses: text(d.courses, 200),
      payment_terms: isOneOf(PAYMENT_TERMS, d.payment_terms) ? d.payment_terms : null,
      payment_status: isOneOf(PAYMENT_STATUSES, d.payment_status) ? d.payment_status : "not_due",
      po_number: text(d.po_number, 80),
      delivery_mode: isOneOf(DELIVERY_MODES, d.delivery_mode) ? d.delivery_mode : null,
      expected_close: date(d.expected_close), cohort_start: date(d.cohort_start), renewal_date: date(d.renewal_date),
      status_note: text(d.status_note, 120), notes: text(d.notes, 4000),
    },
  } as const;
}

/**
 * A new deal, for a company already in Companies (companyId) or a new one
 * with its main contact. The paperwork checklist starts from DEFAULT_DOCS; an
 * NDA or MSA already signed with this company on another deal carries over.
 */
export async function createDeal(p: { companyId: string | null; company?: CompanyInput; contact?: ContactInput; deal: DealInput }): Promise<B2BResult> {
  const admin = await seller();
  if (!admin) return NOT_ALLOWED;
  const d = cleanDeal(p.deal, true);
  if ("error" in d) return { ok: false, message: d.error! };
  if (p.companyId !== null && !UUID.test(p.companyId)) return { ok: false, message: "Pick the company again." };
  if (p.companyId === null && !p.company) return { ok: false, message: "Pick a company or add a new one." };
  if (p.companyId === null && p.contact && p.contact.name.trim()) {
    const c = cleanContact(p.contact);
    if ("error" in c) return { ok: false, message: c.error! };
  }
  const sql = db();
  if (!sql) return UNAVAILABLE;

  let companyId = p.companyId;
  if (companyId === null) {
    const r = await saveCompany(null, p.company!);
    if (!r.ok) return r;
    companyId = r.id!;
    if (p.contact && p.contact.name.trim()) {
      const c = await saveContact(companyId, null, { ...p.contact, is_primary: true });
      if (!c.ok) return { ok: false, message: `The company was added, but not the person: ${c.message}` };
    }
  }

  const v = d.value;
  const kinds = Object.keys(DEFAULT_DOCS);
  const statuses = Object.values(DEFAULT_DOCS) as string[];
  const { data, error } = await sql.row<{ id: string }>`
    with deal as (
      insert into course.b2b_deals (company_id, title, owner_email, source, courses, seats, price_per_seat, discount_inr, value_inr,
        payment_terms, payment_status, po_number, delivery_mode, expected_close, cohort_start, renewal_date,
        next_step, next_step_date, status_note, notes, created_by)
      values (${companyId}, ${v.title}, ${v.owner_email ?? admin.email}, ${v.source}, ${v.courses}, ${v.seats}, ${v.price_per_seat},
        ${v.discount_inr}, ${v.value_inr}, ${v.payment_terms}, ${v.payment_status}, ${v.po_number}, ${v.delivery_mode},
        ${v.expected_close}::date, ${v.cohort_start}::date, ${v.renewal_date}::date, ${v.next_step}, ${v.next_step_date}::date,
        ${v.status_note}, ${v.notes}, ${admin.email})
      returning id, company_id
    ), earlier as (
      select distinct on (x.kind) x.kind, x.version, x.signed_on, x.client_signer, x.link
        from course.b2b_deal_docs x join course.b2b_deals o on o.id = x.deal_id
       where o.company_id = ${companyId} and x.status = 'signed' and x.kind = any(${COMPANY_WIDE_DOCS as string[]}::text[])
       order by x.kind, x.signed_on desc nulls last
    ), docs as (
      insert into course.b2b_deal_docs (deal_id, kind, status, version, signed_on, client_signer, link, updated_by)
      select deal.id, k.kind, case when e.kind is not null then 'signed' else k.status end,
             e.version, e.signed_on, e.client_signer, e.link, ${admin.email}::text
        from deal, unnest(${kinds}::text[], ${statuses}::text[]) as k(kind, status)
        left join earlier e on e.kind = k.kind
      returning 1
    ), history as (
      insert into course.b2b_stage_history (deal_id, from_stage, to_stage, by_email)
      select id, null, 'lead', ${admin.email}::text from deal returning 1
    )
    select id from deal, (select count(*) from docs) n, (select count(*) from history) h
  `;
  if (error || !data) {
    console.error("b2b deal create failed:", error?.code, error?.message);
    return fail(error?.code);
  }
  refresh();
  return { ok: true, id: data.id };
}

/** The deal's details. The stage moves on its own, through setDealStage. */
export async function updateDeal(id: string, input: DealInput): Promise<B2BResult> {
  if (!(await seller())) return NOT_ALLOWED;
  if (!UUID.test(id)) return { ok: false, message: "That deal no longer exists." };
  const sql = db();
  if (!sql) return UNAVAILABLE;
  const { data: cur } = await sql.row<{ stage: string }>`select stage from course.b2b_deals where id = ${id}`;
  if (!cur) return { ok: false, message: "That deal no longer exists." };
  const d = cleanDeal(input, isOpenStage(cur.stage));
  if ("error" in d) return { ok: false, message: d.error! };
  const v = d.value;
  const { data, error } = await sql.run`
    update course.b2b_deals set title = ${v.title}, owner_email = ${v.owner_email}, source = ${v.source}, courses = ${v.courses},
      seats = ${v.seats}, price_per_seat = ${v.price_per_seat}, discount_inr = ${v.discount_inr}, value_inr = ${v.value_inr},
      payment_terms = ${v.payment_terms}, payment_status = ${v.payment_status}, po_number = ${v.po_number},
      delivery_mode = ${v.delivery_mode}, expected_close = ${v.expected_close}::date, cohort_start = ${v.cohort_start}::date,
      renewal_date = ${v.renewal_date}::date, next_step = ${v.next_step}, next_step_date = ${v.next_step_date}::date,
      status_note = ${v.status_note}, notes = ${v.notes}, updated_at = now()
    where id = ${id}`;
  if (error) return fail(error.code);
  if (!data) return { ok: false, message: "That deal no longer exists." };
  refresh();
  return { ok: true, id };
}

/**
 * Moves a deal, and records the move. Signed needs every document signed or
 * marked not needed (checked again inside the update, so a document changed
 * meanwhile can't slip through). Lost needs a reason. An open deal moved out
 * of lost or signed must get a next step again before its details save.
 */
export async function setDealStage(id: string, stage: string, lost?: { reason: string; note: string }): Promise<B2BResult> {
  const admin = await seller();
  if (!admin) return NOT_ALLOWED;
  if (!UUID.test(id)) return { ok: false, message: "That deal no longer exists." };
  if (!isB2BStage(stage)) return { ok: false, message: "Pick a stage." };
  const reason = stage === "lost" ? (lost && isOneOf(LOST_REASONS, lost.reason) ? lost.reason : null) : null;
  if (stage === "lost" && !reason) return { ok: false, message: "Pick why it was lost." };
  const sql = db();
  if (!sql) return UNAVAILABLE;
  if (stage === "signed") {
    const { data: docs, error } = await sql.rows<{ kind: string; status: string }>`select kind, status from course.b2b_deal_docs where deal_id = ${id}`;
    if (error) return fail(error.code);
    const blocked = signBlocked(docs ?? []);
    if (blocked) return { ok: false, message: blocked };
  }
  const lostNote = stage === "lost" ? text(lost?.note, 300) : null;
  const { data, error } = await sql.row<{ moved: boolean }>`
    with cur as (select id, stage from course.b2b_deals where id = ${id}),
    upd as (
      update course.b2b_deals d set
        stage = ${stage},
        stage_changed_at = case when d.stage <> ${stage} then now() else d.stage_changed_at end,
        signed_at = case when ${stage}::text = 'signed' then coalesce(d.signed_at, now()) else null end,
        lost_reason = ${reason}, lost_note = ${lostNote},
        next_step = case when ${stage}::text in ('signed', 'lost') then null else d.next_step end,
        next_step_date = case when ${stage}::text in ('signed', 'lost') then null else d.next_step_date end,
        updated_at = now()
      where d.id = ${id}
        and (${stage}::text <> 'signed' or not exists (
          select 1 from course.b2b_deal_docs x where x.deal_id = d.id and x.status not in ('signed', 'not_needed')))
      returning d.id
    ), hist as (
      insert into course.b2b_stage_history (deal_id, from_stage, to_stage, by_email)
      select cur.id, cur.stage, ${stage}::text, ${admin.email}::text from cur, upd where cur.stage <> ${stage}
      returning 1
    )
    select exists (select 1 from upd) as moved, (select count(*) from hist) as h
  `;
  if (error) return fail(error.code);
  if (!data?.moved) return { ok: false, message: stage === "signed" ? "A document changed meanwhile. Reload and check the checklist." : "That deal no longer exists." };
  refresh();
  return { ok: true, id };
}

/** One quick field from the list or board: the one-line status note. */
export async function setStatusNote(id: string, value: string): Promise<B2BResult> {
  if (!(await seller())) return NOT_ALLOWED;
  if (!UUID.test(id)) return { ok: false, message: "That deal no longer exists." };
  const sql = db();
  if (!sql) return UNAVAILABLE;
  const { data, error } = await sql.run`update course.b2b_deals set status_note = ${text(value, 120)}, updated_at = now() where id = ${id}`;
  if (error) return fail(error.code);
  if (!data) return { ok: false, message: "That deal no longer exists." };
  refresh();
  return { ok: true, id };
}

export async function deleteDeal(id: string): Promise<B2BResult> {
  const admin = await seller();
  if (!admin) return NOT_ALLOWED;
  if (!UUID.test(id)) return { ok: false, message: "That deal no longer exists." };
  const sql = db();
  if (!sql) return UNAVAILABLE;
  const { data, error } = await sql.row<{ title: string; company_id: string }>`
    delete from course.b2b_deals where id = ${id} returning title, company_id`;
  if (error) return fail(error.code, { ok: false, message: "That could not be deleted." });
  if (data) await logAdmin(admin, "b2b.deal_delete", id, { title: data.title, company: data.company_id });
  refresh();
  return { ok: true, id: data?.company_id };
}

// ── Paperwork ───────────────────────────────────────────────

export interface DocInput { status: string; version: string; sent_on: string; signed_on: string; client_signer: string; link: string }

export async function saveDoc(dealId: string, kind: string, input: DocInput): Promise<B2BResult> {
  const admin = await seller();
  if (!admin) return NOT_ALLOWED;
  if (!UUID.test(dealId)) return { ok: false, message: "That deal no longer exists." };
  if (!isDocKind(kind)) return { ok: false, message: "Pick a document." };
  if (!isDocStatus(input.status)) return { ok: false, message: "Pick where the document stands." };
  const link = input.link.trim() ? cleanUrl(input.link) : null;
  if (input.link.trim() && !link) return { ok: false, message: "That link doesn't look right. Paste the Drive or PDF link." };
  const sent = date(input.sent_on) ?? (["sent", "client_review"].includes(input.status) ? istToday() : null);
  const signed = date(input.signed_on) ?? (input.status === "signed" ? istToday() : null);
  const sql = db();
  if (!sql) return UNAVAILABLE;
  const { error } = await sql.run`
    insert into course.b2b_deal_docs (deal_id, kind, status, version, sent_on, signed_on, client_signer, link, updated_at, updated_by)
    values (${dealId}, ${kind}, ${input.status}, ${text(input.version, 20)}, ${sent}::date, ${signed}::date,
            ${text(input.client_signer, 120)}, ${link}, now(), ${admin.email})
    on conflict (deal_id, kind) do update set status = excluded.status, version = excluded.version, sent_on = excluded.sent_on,
      signed_on = excluded.signed_on, client_signer = excluded.client_signer, link = excluded.link,
      updated_at = now(), updated_by = excluded.updated_by`;
  if (error) return fail(error.code, error.code === "23503" ? { ok: false, message: "That deal no longer exists." } : FAILED);
  refresh();
  return { ok: true };
}

// ── Activity and tasks ──────────────────────────────────────

/**
 * One call, message, meeting or note, and optionally the next step. The
 * first two-way contact on a deal still at Lead moves it to In progress.
 */
export async function logActivity(
  dealId: string,
  a: { kind: string; replied: boolean; attendees: string; note: string; next_step: string; next_step_date: string },
): Promise<B2BResult> {
  const admin = await seller();
  if (!admin) return NOT_ALLOWED;
  if (!UUID.test(dealId)) return { ok: false, message: "That deal no longer exists." };
  if (!isOneOf(ACTIVITY_KINDS, a.kind)) return { ok: false, message: "Pick what it was." };
  const note = text(a.note, 2000);
  if (a.kind === "note" && !note) return { ok: false, message: "Write the note." };
  const nextStep = text(a.next_step, 200);
  const nextDate = date(a.next_step_date);
  if ((nextStep && !nextDate) || (!nextStep && nextDate)) return { ok: false, message: "Give the next step both a description and a date." };
  const sql = db();
  if (!sql) return UNAVAILABLE;
  const replied = a.kind !== "note" && (a.replied || a.kind === "meeting");
  const { data, error } = await sql.row<{ id: string }>`
    with act as (
      insert into course.b2b_activities (deal_id, by_email, kind, replied, attendees, note)
      values (${dealId}, ${admin.email}, ${a.kind}, ${replied}, ${a.kind === "meeting" ? text(a.attendees, 300) : null}, ${note})
      returning id
    ), cur as (select id, stage from course.b2b_deals where id = ${dealId}),
    upd as (
      update course.b2b_deals d set
        stage = case when ${replied}::boolean and d.stage = 'lead' then 'in_progress' else d.stage end,
        stage_changed_at = case when ${replied}::boolean and d.stage = 'lead' then now() else d.stage_changed_at end,
        next_step = coalesce(${nextStep}::text, d.next_step),
        next_step_date = coalesce(${nextDate}::date, d.next_step_date),
        owner_email = coalesce(d.owner_email, ${admin.email}),
        updated_at = now()
      where d.id = ${dealId} and exists (select 1 from act)
      returning d.id
    ), hist as (
      insert into course.b2b_stage_history (deal_id, from_stage, to_stage, by_email)
      select cur.id, 'lead', 'in_progress', ${admin.email}::text from cur where ${replied}::boolean and cur.stage = 'lead'
      returning 1
    )
    select id from act, (select count(*) from upd) u, (select count(*) from hist) h
  `;
  if (error || !data) {
    if (error) console.error("b2b activity failed:", error.code, error.message);
    return fail(error?.code, error?.code === "23503" ? { ok: false, message: "That deal no longer exists." } : FAILED);
  }
  refresh();
  return { ok: true };
}

export async function addTask(dealId: string, t: { title: string; due: string; assignee_email: string }): Promise<B2BResult> {
  const admin = await seller();
  if (!admin) return NOT_ALLOWED;
  if (!UUID.test(dealId)) return { ok: false, message: "That deal no longer exists." };
  const title = text(t.title, 200);
  if (!title) return { ok: false, message: "Write the task." };
  const assignee = normaliseEmail(t.assignee_email) ?? admin.email;
  if (!canOwn(assignee)) return { ok: false, message: "Tasks can only be given to an owner or a sales manager." };
  const sql = db();
  if (!sql) return UNAVAILABLE;
  const { error } = await sql.run`
    insert into course.b2b_tasks (deal_id, title, due, assignee_email, created_by)
    values (${dealId}, ${title}, ${date(t.due)}::date, ${assignee}, ${admin.email})`;
  if (error) return fail(error.code, error.code === "23503" ? { ok: false, message: "That deal no longer exists." } : FAILED);
  refresh();
  return { ok: true };
}

export async function setTaskDone(id: string, done: boolean): Promise<B2BResult> {
  const admin = await seller();
  if (!admin) return NOT_ALLOWED;
  if (!UUID.test(id)) return { ok: false, message: "That task is no longer here." };
  const sql = db();
  if (!sql) return UNAVAILABLE;
  const { error } = await sql.run`
    update course.b2b_tasks set done_at = case when ${done}::boolean then now() else null end,
      done_by = case when ${done}::boolean then ${admin.email} else null end
    where id = ${id}`;
  if (error) return fail(error.code);
  refresh();
  return { ok: true };
}

export async function deleteTask(id: string): Promise<B2BResult> {
  if (!(await seller())) return NOT_ALLOWED;
  if (!UUID.test(id)) return { ok: false, message: "That task is no longer here." };
  const sql = db();
  if (!sql) return UNAVAILABLE;
  const { error } = await sql.run`delete from course.b2b_tasks where id = ${id}`;
  if (error) return fail(error.code);
  refresh();
  return { ok: true };
}

// ── After signing: the /org workspace ───────────────────────

/**
 * Creates the company's /org workspace from a signed deal: its name, the URL
 * name given, and the deal's seats. With `addHr`, the deal's main contact
 * becomes the company's first HR person and is emailed how to sign in.
 */
export async function createWorkspace(dealId: string, rawSlug: string, addHr: boolean): Promise<B2BResult> {
  const admin = await seller();
  if (!admin) return NOT_ALLOWED;
  if (!UUID.test(dealId)) return { ok: false, message: "That deal no longer exists." };
  const slug = companySlug(rawSlug);
  if (!slug.ok) return slug;
  const sql = db();
  if (!sql) return UNAVAILABLE;
  const { data: d, error: readError } = await sql.row<{ stage: string; seats: number; b2b_company: string; name: string; workspace: string | null; email: string | null; contact: string | null }>`
    select d.stage, d.seats, c.id as b2b_company, c.name, c.company_id as workspace, p.email, p.name as contact
      from course.b2b_deals d join course.b2b_companies c on c.id = d.company_id
      left join course.b2b_contacts p on p.company_id = c.id and p.is_primary
     where d.id = ${dealId}`;
  if (readError) return fail(readError.code);
  if (!d) return { ok: false, message: "That deal no longer exists." };
  if (d.stage !== "signed") return { ok: false, message: "Create the workspace once the deal is signed." };
  if (d.workspace) return { ok: false, message: "This company already has a workspace." };
  if (addHr && !d.email) return { ok: false, message: "The main contact has no email. Add one, or untick HR." };

  const { data: w, error } = await sql.row<{ id: string }>`
    with ws as (
      insert into course.companies (name, slug, seat_count) values (${d.name}, ${slug.value}, ${Math.max(d.seats, addHr ? 1 : 0)})
      returning id
    ), link as (
      update course.b2b_companies set company_id = (select id from ws), updated_at = now()
       where id = ${d.b2b_company} and company_id is null returning 1
    )
    select id from ws, (select count(*) from link) l
  `;
  if (error?.code === "23505") return { ok: false, message: `The URL name "${slug.value}" is already used by another company.` };
  if (error || !w) {
    console.error("b2b workspace create failed:", error?.code, error?.message);
    return FAILED;
  }
  await logAdmin(admin, "company.create", w.id, { name: d.name, slug: slug.value, seats: d.seats, from_deal: dealId });
  revalidatePath("/admin/companies");
  refresh();
  if (!addHr) return { ok: true, message: `Workspace created at /org/${slug.value} with ${d.seats} seats.` };
  const hr = await addFirstHr(w.id, d.email!, d.contact ?? "");
  return hr.ok
    ? { ok: true, message: `Workspace created at /org/${slug.value}. ${hr.message ?? ""}`.trim() }
    : { ok: true, message: `Workspace created at /org/${slug.value}, but HR wasn't added: ${hr.message} Add them from Companies.` };
}

/** Links a workspace that already exists in Companies (made by hand earlier). */
export async function linkWorkspace(b2bCompanyId: string, rawSlug: string): Promise<B2BResult> {
  const admin = await seller();
  if (!admin) return NOT_ALLOWED;
  if (!UUID.test(b2bCompanyId)) return { ok: false, message: "That company no longer exists." };
  const slug = companySlug(rawSlug);
  if (!slug.ok) return slug;
  const sql = db();
  if (!sql) return UNAVAILABLE;
  const { data, error } = await sql.row<{ id: string }>`
    update course.b2b_companies c set company_id = w.id, updated_at = now()
      from course.companies w
     where c.id = ${b2bCompanyId} and w.slug = ${slug.value}
     returning w.id`;
  if (error?.code === "23505") return { ok: false, message: "That workspace is already linked to another company here." };
  if (error) return fail(error.code);
  if (!data) return { ok: false, message: `No workspace is called "${slug.value}". Check the URL name in Companies.` };
  await logAdmin(admin, "b2b.workspace_link", b2bCompanyId, { slug: slug.value, company: data.id });
  refresh();
  return { ok: true, message: `Linked to /org/${slug.value}.` };
}
