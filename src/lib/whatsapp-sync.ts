/**
 * How a WhatsApp dashboard message becomes a sales touch. Pure, so it can be
 * tested without either database.
 *
 * The dashboard keeps every message in its D1 `messages` table: direction
 * 'outbound' (we sent it: a campaign template or an inbox reply) or
 * 'inbound' (they sent it). Its timestamps are SQLite CURRENT_TIMESTAMP, UTC
 * without a zone: '2026-11-13 08:09:23'.
 */
import { isSource, normalisePhone, type Source } from "@/lib/sales";

export interface WaMessage {
  id: number;
  phone: string;
  direction: string;
  status: string;
  template_name: string | null;
  body: string | null;
  created_at: string;
  /** datetime(updated_at), the sync cursor. */
  u: string;
  contact_name: string | null;
  contact_source: string | null;
  contact_batch: string | null;
  assigned_to: string | null;
  campaign_batch: string | null;
}

export interface PlannedLead {
  phone: string;
  name: string;
  source: Source;
  source_detail: string;
  owner_email: string | null;
}

export interface PlannedTouch {
  external_id: string;
  phone: string;
  inbound: boolean;
  created_at: string;
  note: string | null;
}

export interface WaPlan {
  leads: PlannedLead[];
  touches: PlannedTouch[];
  /** Sends that failed: a touch already written for one is removed. */
  failed: string[];
  /** Phones that wrote to us, so a new lead moves to warm. */
  repliedPhones: string[];
}

/** A send Meta rejected or never delivered reached nobody, so it isn't outreach. */
const FAILED = new Set(["failed", "error", "undeliverable"]);

/** '2026-11-13 08:09:23' (UTC) → ISO. */
export function d1Time(value: string): string {
  const iso = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const t = Date.parse(iso.endsWith("Z") || /[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`);
  return Number.isNaN(t) ? new Date().toISOString() : new Date(t).toISOString();
}

function sourceOf(m: WaMessage): Source {
  const raw = (m.contact_source ?? "").trim().toLowerCase();
  if (isSource(raw)) return raw;
  const hint = `${m.contact_source ?? ""} ${m.contact_batch ?? ""} ${m.campaign_batch ?? ""}`.toLowerCase();
  if (hint.includes("hackathon") || hint.includes("vicodathon")) return "hackathon";
  if (hint.includes("webinar")) return "webinar";
  if (hint.includes("referr")) return "referral";
  if (hint.includes("college")) return "college";
  return "other";
}

export function planWhatsAppPage(messages: WaMessage[], admins: Set<string>): WaPlan {
  const leads = new Map<string, PlannedLead>();
  const touches: PlannedTouch[] = [];
  const failed: string[] = [];
  const replied = new Set<string>();

  for (const m of messages) {
    const phone = normalisePhone(m.phone);
    if (!phone) continue;
    const external_id = `wa:${m.id}`;
    const inbound = m.direction === "inbound";
    if (!inbound && FAILED.has(m.status)) { failed.push(external_id); continue; }

    if (!leads.has(phone)) {
      const owner = m.assigned_to?.trim().toLowerCase() ?? "";
      leads.set(phone, {
        phone,
        name: m.contact_name?.trim().slice(0, 120) || `WhatsApp +${phone}`,
        source: sourceOf(m),
        source_detail: (m.contact_batch?.trim() || m.campaign_batch?.trim() || "WhatsApp dashboard").slice(0, 120),
        owner_email: admins.has(owner) ? owner : null,
      });
    }
    const text = m.body?.trim();
    touches.push({
      external_id,
      phone,
      inbound,
      created_at: d1Time(m.created_at),
      note: inbound
        ? (text ? text.slice(0, 1000) : "Replied on WhatsApp")
        : (m.template_name ? `Template: ${m.template_name}` : text ? text.slice(0, 1000) : null),
    });
    if (inbound) replied.add(phone);
  }
  return { leads: [...leads.values()], touches, failed, repliedPhones: [...replied] };
}
