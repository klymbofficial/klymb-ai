"use server";

import { revalidatePath } from "next/cache";
import { getAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db/client";
import { normaliseEmail } from "@/lib/email";
import { AUTO_FOLLOW_UP_DAYS, isChannel, isSource, isStage, istToday, normalisePhone, parseLeadsCsv, type Source } from "@/lib/sales";

export type SalesResult = { ok: true; id?: string } | { ok: false; message: string };

export interface LeadInput {
  name: string;
  phone: string;
  email: string;
  kind: string;
  source: string;
  source_detail: string;
  org: string;
  owner_email: string;
  next_follow_up: string;
  notes: string;
}

const text = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const date = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
const uuid = (v: unknown) => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);

function refresh(id?: string) {
  revalidatePath("/admin/sales");
  revalidatePath("/admin/sales/leads");
  revalidatePath("/admin/sales/list");
  if (id) revalidatePath(`/admin/sales/leads/${id}`);
}

function clean(input: LeadInput) {
  const name = text(input.name, 120);
  if (!name) return { error: "Add a name." } as const;
  const phone = input.phone.trim() ? normalisePhone(input.phone) : null;
  if (input.phone.trim() && !phone) return { error: "That phone number doesn't look right." } as const;
  const email = input.email.trim() ? normaliseEmail(input.email) : null;
  if (input.email.trim() && !email) return { error: "That email doesn't look right." } as const;
  if (!phone && !email) return { error: "Add a phone number or an email." } as const;
  if (!isSource(input.source)) return { error: "Pick a source." } as const;
  return {
    value: {
      name, phone, email,
      kind: input.kind === "b2b" ? "b2b" : "b2c",
      source: input.source,
      source_detail: text(input.source_detail, 120),
      org: text(input.org, 120),
      owner_email: normaliseEmail(input.owner_email),
      next_follow_up: date(input.next_follow_up),
      notes: text(input.notes, 2000),
    },
  } as const;
}

function duplicate(code: string | undefined) {
  return code === "23505" ? "A lead with this phone or email already exists." : "That could not be saved.";
}

export async function createLead(input: LeadInput): Promise<SalesResult> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, message: "Not authorised." };
  const sql = db();
  if (!sql) return { ok: false, message: "Unavailable right now." };
  const c = clean(input);
  if ("error" in c) return { ok: false, message: c.error! };
  const v = c.value;
  const { data, error } = await sql.row<{ id: string }>`
    insert into course.sales_leads (name, phone, email, kind, source, source_detail, org, owner_email, next_follow_up, notes, created_by)
    values (${v.name}, ${v.phone}, ${v.email}, ${v.kind}, ${v.source}, ${v.source_detail}, ${v.org},
            ${v.owner_email ?? admin.email}, ${v.next_follow_up}::date, ${v.notes}, ${admin.email})
    returning id
  `;
  if (error || !data) return { ok: false, message: duplicate(error?.code) };
  refresh();
  return { ok: true, id: data.id };
}

export async function updateLead(id: string, input: LeadInput & { stage: string }): Promise<SalesResult> {
  if (!(await getAdmin())) return { ok: false, message: "Not authorised." };
  if (!uuid(id)) return { ok: false, message: "That lead no longer exists." };
  const sql = db();
  if (!sql) return { ok: false, message: "Unavailable right now." };
  const c = clean(input);
  if ("error" in c) return { ok: false, message: c.error! };
  if (!isStage(input.stage)) return { ok: false, message: "Pick a stage." };
  const v = c.value;
  const { data, error } = await sql.run`
    update course.sales_leads set
      name = ${v.name}, phone = ${v.phone}, email = ${v.email}, kind = ${v.kind}, source = ${v.source},
      source_detail = ${v.source_detail}, org = ${v.org}, owner_email = ${v.owner_email},
      next_follow_up = ${v.next_follow_up}::date, notes = ${v.notes},
      stage_changed_at = case when stage <> ${input.stage} then now() else stage_changed_at end,
      signed_at = case when ${input.stage} = 'signed' then coalesce(signed_at, now()) else null end,
      stage = ${input.stage}, updated_at = now()
    where id = ${id}
  `;
  if (error) return { ok: false, message: duplicate(error.code) };
  if (!data) return { ok: false, message: "That lead no longer exists." };
  refresh(id);
  return { ok: true, id };
}

/**
 * One outreach. A reply moves a new lead to warm, and the optional stage and
 * follow-up date are saved in the same step, which is how the team works a
 * call list: log it, set when to try next, move on.
 */
export async function logTouch(
  leadId: string,
  t: { channel: string; replied: boolean; note: string; stage: string; next_follow_up: string },
): Promise<SalesResult> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, message: "Not authorised." };
  if (!uuid(leadId)) return { ok: false, message: "That lead no longer exists." };
  if (!isChannel(t.channel)) return { ok: false, message: "Pick a channel." };
  const sql = db();
  if (!sql) return { ok: false, message: "Unavailable right now." };

  const note = text(t.note, 1000);
  const { error } = await sql.run`
    insert into course.sales_touches (lead_id, by_email, channel, replied, note)
    values (${leadId}, ${admin.email}, ${t.channel}, ${t.replied}, ${note})
  `;
  if (error) {
    console.error("touch log failed:", error.code, error.message);
    return { ok: false, message: error.code === "23503" ? "That lead no longer exists." : "That could not be saved." };
  }

  const stage = isStage(t.stage) ? t.stage : null;
  const follow = date(t.next_follow_up);
  const today = istToday();
  await sql.run`
    update course.sales_leads set
      stage = coalesce(${stage}::text, case when ${t.replied}::boolean and stage = 'new' then 'warm' else stage end),
      stage_changed_at = case when coalesce(${stage}::text, case when ${t.replied}::boolean and stage = 'new' then 'warm' else stage end) <> stage
                              then now() else stage_changed_at end,
      signed_at = case when ${stage}::text = 'signed' then coalesce(signed_at, now())
                       when ${stage}::text is null then signed_at else null end,
      -- Every open lead keeps a next step, as CRMs insist on: with no date
      -- given, a follow-up that is missing or already due moves out two days.
      next_follow_up = case when ${follow}::date is not null then ${follow}::date
                            when coalesce(${stage}::text, stage) in ('signed', 'rejected') then null
                            when next_follow_up is null or next_follow_up <= ${today}::date
                              then ${today}::date + ${AUTO_FOLLOW_UP_DAYS}::int
                            else next_follow_up end,
      owner_email = coalesce(owner_email, ${admin.email}),
      updated_at = now()
    where id = ${leadId}
  `;
  refresh(leadId);
  return { ok: true };
}

export async function deleteLead(id: string): Promise<SalesResult> {
  if (!(await getAdmin())) return { ok: false, message: "Not authorised." };
  if (!uuid(id)) return { ok: false, message: "That lead no longer exists." };
  const sql = db();
  if (!sql) return { ok: false, message: "Unavailable right now." };
  const { error } = await sql.run`delete from course.sales_leads where id = ${id}`;
  if (error) return { ok: false, message: "That could not be deleted." };
  refresh();
  return { ok: true };
}

export type ImportResult =
  | { ok: true; added: number; existing: number; skipped: { line: number; reason: string }[] }
  | { ok: false; message: string };

/** A sheet or a WhatsApp-dashboard export. Leads already here (same phone or email) are left alone. */
export async function importLeads(csv: string, opts: { source: string; source_detail: string; owner_email: string }): Promise<ImportResult> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, message: "Not authorised." };
  if (csv.length > 2_000_000) return { ok: false, message: "That file is too big. Split it into files under 2 MB." };
  const source: Source = isSource(opts.source) ? opts.source : "other";
  const parsed = parseLeadsCsv(csv, source);
  if (parsed.missingHeaders.length) {
    return { ok: false, message: `The first row needs a column for: ${parsed.missingHeaders.join(" and ")}.` };
  }
  if (!parsed.rows.length) return { ok: false, message: "No usable rows found." };
  const sql = db();
  if (!sql) return { ok: false, message: "Unavailable right now." };

  const detail = text(opts.source_detail, 120);
  const owner = normaliseEmail(opts.owner_email);
  const r = parsed.rows;
  const { data, error } = await sql.run`
    insert into course.sales_leads (name, phone, email, source, source_detail, org, stage, notes, owner_email, created_by)
    select u.name, u.phone, u.email, u.source, coalesce(u.detail, ${detail}), u.org, u.stage, u.notes, ${owner}, ${admin.email}
      from unnest(${r.map((x) => x.name)}::text[], ${r.map((x) => x.phone)}::text[], ${r.map((x) => x.email)}::text[],
                  ${r.map((x) => x.source)}::text[], ${r.map((x) => x.source_detail)}::text[], ${r.map((x) => x.org)}::text[],
                  ${r.map((x) => x.stage)}::text[], ${r.map((x) => x.notes)}::text[])
        as u(name, phone, email, source, detail, org, stage, notes)
    on conflict do nothing
  `;
  if (error) {
    console.error("lead import failed:", error.code, error.message);
    return { ok: false, message: "The import failed. Nothing was added." };
  }
  refresh();
  const added = data ?? 0;
  return { ok: true, added, existing: r.length - added, skipped: parsed.skipped };
}

export async function saveTarget(month: string, t: { enrolments: number; b2b: number; hackathons: number; webinars: number }): Promise<SalesResult> {
  if (!(await getAdmin())) return { ok: false, message: "Not authorised." };
  if (!/^\d{4}-\d{2}-01$/.test(month)) return { ok: false, message: "Pick a month." };
  const vals = [t.enrolments, t.b2b, t.hackathons, t.webinars].map((x) => Math.max(0, Math.min(100000, Math.floor(Number(x) || 0))));
  const sql = db();
  if (!sql) return { ok: false, message: "Unavailable right now." };
  const { error } = await sql.run`
    insert into course.sales_targets (month, enrolments, b2b, hackathons, webinars)
    values (${month}::date, ${vals[0]}, ${vals[1]}, ${vals[2]}, ${vals[3]})
    on conflict (month) do update set enrolments = excluded.enrolments, b2b = excluded.b2b,
      hackathons = excluded.hackathons, webinars = excluded.webinars
  `;
  if (error) return { ok: false, message: "That could not be saved." };
  refresh();
  return { ok: true };
}

export type SyncActionResult = { ok: true; text: string } | { ok: false; message: string };

/** The "Sync WhatsApp" button: the same sync the cron runs. */
export async function syncWhatsAppNow(): Promise<SyncActionResult> {
  if (!(await getAdmin())) return { ok: false, message: "Not authorised." };
  const { syncWhatsApp } = await import("@/lib/admin/whatsapp-sync");
  const { captureWebsiteLeads } = await import("@/lib/admin/sales-capture");
  const web = await captureWebsiteLeads();
  const r = await syncWhatsApp();
  refresh();
  const webText = web ? ` ${web} new from website forms.` : "";
  if (!r.ok) return { ok: false, message: `${r.message ?? "The WhatsApp sync failed."}${webText}` };
  return {
    ok: true,
    text: (r.read
      ? `Read ${r.read} messages: ${r.touches} new touches, ${r.leads} new leads${r.removed ? `, ${r.removed} failed sends removed` : ""}.`
      : "WhatsApp is up to date.") + webText,
  };
}

/** The sheet's quick-add row: a name and a number (or email) is enough. Owned by whoever adds it. */
export async function quickAddLead(raw: { name: string; contact: string; note: string; source: string }): Promise<SalesResult> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, message: "Not authorised." };
  const contact = raw.contact.trim();
  const isEmail = contact.includes("@");
  return createLead({
    name: raw.name, phone: isEmail ? "" : contact, email: isEmail ? contact : "", kind: "b2c",
    source: isSource(raw.source) ? raw.source : "other", source_detail: "", org: "",
    owner_email: admin.email, next_follow_up: "", notes: raw.note,
  });
}

/** One cell of the sheet: stage, next follow-up, notes or owner. */
export async function updateLeadField(id: string, field: "stage" | "next_follow_up" | "notes" | "owner_email", value: string): Promise<SalesResult> {
  if (!(await getAdmin())) return { ok: false, message: "Not authorised." };
  if (!uuid(id)) return { ok: false, message: "That lead no longer exists." };
  const sql = db();
  if (!sql) return { ok: false, message: "Unavailable right now." };

  let result;
  if (field === "stage") {
    if (!isStage(value)) return { ok: false, message: "Pick a stage." };
    result = await sql.run`
      update course.sales_leads set
        stage_changed_at = case when stage <> ${value} then now() else stage_changed_at end,
        signed_at = case when ${value}::text = 'signed' then coalesce(signed_at, now()) else null end,
        next_follow_up = case when ${value}::text in ('signed', 'rejected') then null else next_follow_up end,
        stage = ${value}, updated_at = now()
      where id = ${id}`;
  } else if (field === "next_follow_up") {
    if (value && !date(value)) return { ok: false, message: "Pick a date." };
    result = await sql.run`update course.sales_leads set next_follow_up = ${value || null}::date, updated_at = now() where id = ${id}`;
  } else if (field === "notes") {
    result = await sql.run`update course.sales_leads set notes = ${text(value, 2000)}, updated_at = now() where id = ${id}`;
  } else if (field === "owner_email") {
    result = await sql.run`update course.sales_leads set owner_email = ${normaliseEmail(value)}, updated_at = now() where id = ${id}`;
  } else {
    return { ok: false, message: "That can't be changed here." };
  }
  if (result.error) return { ok: false, message: "That could not be saved." };
  if (!result.data) return { ok: false, message: "That lead no longer exists." };
  refresh(id);
  return { ok: true, id };
}

/** One tap after a call: logs it with its outcome and sets the next step. */
export async function logCallOutcome(leadId: string, outcome: string): Promise<SalesResult> {
  const { CALL_OUTCOMES, addDays } = await import("@/lib/sales");
  const o = CALL_OUTCOMES.find((x) => x.key === outcome);
  if (!o) return { ok: false, message: "Pick what happened on the call." };
  return logTouch(leadId, {
    channel: "call",
    replied: o.replied,
    note: o.label,
    stage: o.stage ?? "",
    next_follow_up: o.followDays ? addDays(istToday(), o.followDays) : "",
  });
}
