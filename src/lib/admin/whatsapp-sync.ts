import "server-only";
import { db } from "@/lib/db/client";
import { WHATSAPP_BY } from "@/lib/sales";
import { planWhatsAppPage, type WaMessage } from "@/lib/whatsapp-sync";

/**
 * Pulls the WhatsApp dashboard's messages into sales touches.
 *
 * The dashboard is a Cloudflare Worker with a D1 database. It is read through
 * Cloudflare's D1 HTTP API with a token that may only read D1, so nothing
 * here can change what the dashboard sends. Needs:
 *   WHATSAPP_D1_TOKEN       Cloudflare API token, Account › D1 › Read
 *   WHATSAPP_D1_ACCOUNT_ID  defaults to the klymbofficial account
 *   WHATSAPP_D1_DATABASE_ID defaults to the klymb-whatsapp database
 *
 * Reads in (updated_at, id) order from where the last run stopped, so a send
 * that later fails is seen again and its touch removed. Safe to run as often
 * as you like: every touch carries the message id and is written once.
 */

const ACCOUNT = process.env.WHATSAPP_D1_ACCOUNT_ID || "85399817f57a8d877880e0560c7c40bf";
const DATABASE = process.env.WHATSAPP_D1_DATABASE_ID || "1ede5e7e-7d77-4217-9462-466616d738d9";
const PAGE = 500;
const MAX_PAGES = 20;

export function whatsappSyncConfigured() {
  return Boolean(process.env.WHATSAPP_D1_TOKEN);
}

async function d1<T>(sql: string, params: unknown[]): Promise<T[]> {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/d1/database/${DATABASE}/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_D1_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ sql, params }),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as
    | { success: boolean; errors?: { message: string }[]; result?: { results: T[] }[] }
    | null;
  if (!res.ok || !json?.success) {
    throw new Error(`D1 ${res.status}: ${json?.errors?.map((e) => e.message).join("; ") || "request failed"}`);
  }
  return json.result?.[0]?.results ?? [];
}

const PAGE_SQL = `
  select m.id, m.phone, m.direction, m.status, m.template_name, substr(m.body, 1, 1000) as body, m.created_at,
         datetime(m.updated_at) as u,
         c.name as contact_name, c.source as contact_source, c.batch as contact_batch, c.assigned_to,
         cp.batch as campaign_batch
    from messages m
    left join contacts c on c.phone = m.phone
    left join campaigns cp on cp.id = m.campaign_id
   where datetime(m.updated_at) > ?1 or (datetime(m.updated_at) = ?1 and m.id > ?2)
   order by datetime(m.updated_at), m.id
   limit ${PAGE}`;

export interface SyncResult {
  ok: boolean;
  read: number;
  touches: number;
  leads: number;
  removed: number;
  message?: string;
}

export async function syncWhatsApp(): Promise<SyncResult> {
  const sql = db();
  if (!sql) return { ok: false, read: 0, touches: 0, leads: 0, removed: 0, message: "Database unavailable." };
  if (!whatsappSyncConfigured()) {
    return { ok: false, read: 0, touches: 0, leads: 0, removed: 0, message: "WHATSAPP_D1_TOKEN is not set." };
  }

  const { data: state } = await sql.row<{ cursor_at: string; cursor_id: number }>`
    select cursor_at, cursor_id from course.sales_sync_state where source = 'whatsapp'
  `;
  let cursorAt = state?.cursor_at ?? "";
  let cursorId = Number(state?.cursor_id ?? 0);
  const { data: adminRows } = await sql.rows<{ email: string }>`select email from course.admin_users`;
  const admins = new Set((adminRows ?? []).map((a) => a.email));
  const total = { read: 0, touches: 0, leads: 0, removed: 0 };

  try {
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const rows = await d1<WaMessage>(PAGE_SQL, [cursorAt, cursorId]);
      if (!rows.length) break;
      const plan = planWhatsAppPage(rows, admins);

      if (plan.leads.length) {
        const l = plan.leads;
        const { data } = await sql.run`
          insert into course.sales_leads (name, phone, source, source_detail, owner_email, created_by)
          select u.name, u.phone, u.source, u.detail, u.owner, ${WHATSAPP_BY}
            from unnest(${l.map((x) => x.name)}::text[], ${l.map((x) => x.phone)}::text[], ${l.map((x) => x.source)}::text[],
                        ${l.map((x) => x.source_detail)}::text[], ${l.map((x) => x.owner_email)}::text[])
              as u(name, phone, source, detail, owner)
          on conflict do nothing
        `;
        total.leads += data ?? 0;
      }

      if (plan.touches.length) {
        const t = plan.touches;
        const { data, error } = await sql.run`
          insert into course.sales_touches (lead_id, by_email, channel, replied, inbound, note, created_at, external_id)
          select l.id, ${WHATSAPP_BY}, 'whatsapp', u.inbound, u.inbound, u.note, u.created_at, u.external_id
            from unnest(${t.map((x) => x.phone)}::text[], ${t.map((x) => x.inbound)}::boolean[], ${t.map((x) => x.note)}::text[],
                        ${t.map((x) => x.created_at)}::timestamptz[], ${t.map((x) => x.external_id)}::text[])
              as u(phone, inbound, note, created_at, external_id)
            join course.sales_leads l on l.phone = u.phone
          on conflict do nothing
        `;
        if (error) throw new Error(`touch write failed: ${error.message}`);
        total.touches += data ?? 0;
      }

      if (plan.failed.length) {
        const { data } = await sql.run`delete from course.sales_touches where external_id = any(${plan.failed}::text[])`;
        total.removed += data ?? 0;
      }

      if (plan.repliedPhones.length) {
        await sql.run`
          update course.sales_leads set stage = 'warm', stage_changed_at = now(), updated_at = now()
           where stage = 'new' and phone = any(${plan.repliedPhones}::text[])
        `;
      }

      const last = rows[rows.length - 1];
      cursorAt = last.u;
      cursorId = Number(last.id);
      total.read += rows.length;
      await sql.run`
        update course.sales_sync_state set cursor_at = ${cursorAt}, cursor_id = ${cursorId}, synced_at = now(), last_error = null
         where source = 'whatsapp'
      `;
      if (rows.length < PAGE) break;
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("whatsapp sync failed:", message);
    await sql.run`update course.sales_sync_state set last_error = ${message.slice(0, 500)} where source = 'whatsapp'`;
    return { ok: false, ...total, message };
  }

  await sql.run`update course.sales_sync_state set synced_at = now() where source = 'whatsapp'`;
  return { ok: true, ...total };
}

export async function whatsappSyncStatus(): Promise<{ configured: boolean; synced_at: string | null; last_error: string | null }> {
  const sql = db();
  const configured = whatsappSyncConfigured();
  if (!sql) return { configured, synced_at: null, last_error: null };
  const { data } = await sql.row<{ synced_at: string | null; last_error: string | null }>`
    select synced_at, last_error from course.sales_sync_state where source = 'whatsapp'
  `;
  return { configured, synced_at: data?.synced_at ?? null, last_error: data?.last_error ?? null };
}
