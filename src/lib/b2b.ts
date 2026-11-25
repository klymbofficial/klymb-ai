/**
 * B2B rules, kept free of the database and of Next so they can be tested:
 * the deal stages and their win chance, the paperwork checklist, the deal
 * value, and when a deal needs attention.
 */
import { istToday } from "@/lib/sales";

export const B2B_STAGES = [
  { key: "lead", label: "Lead", hint: "Company identified, not engaged yet", win: 10 },
  { key: "in_progress", label: "In progress", hint: "First contact made, qualifying", win: 20 },
  { key: "in_discussion", label: "In discussion", hint: "Talking scope, seats and price", win: 40 },
  { key: "document_needed", label: "Document needed", hint: "Agreed in principle, paperwork pending", win: 70 },
  { key: "signed", label: "Signed", hint: "Every document signed", win: 100 },
  { key: "on_hold", label: "On hold", hint: "Paused by the client", win: 10 },
  { key: "lost", label: "Lost", hint: "Not going ahead", win: 0 },
] as const;
export type B2BStage = (typeof B2B_STAGES)[number]["key"];

export const CLOSED_STAGES: readonly B2BStage[] = ["signed", "lost"];
export const isOpenStage = (s: string) => !CLOSED_STAGES.includes(s as B2BStage);

/** A deal with no activity for this many days is flagged as going stale. */
export const STALE_DAYS = 14;

export const LOST_REASONS = [
  { key: "price", label: "Price too high" },
  { key: "no_budget", label: "No budget" },
  { key: "competitor", label: "Went with a competitor" },
  { key: "timing", label: "Bad timing" },
  { key: "no_response", label: "Stopped responding" },
  { key: "not_a_fit", label: "Not a fit" },
  { key: "in_house", label: "Training in-house" },
  { key: "other", label: "Other" },
] as const;

export const DOC_KINDS = [
  { key: "proposal", label: "Proposal / quote" },
  { key: "nda", label: "NDA" },
  { key: "msa", label: "MSA" },
  { key: "sow", label: "SOW" },
  { key: "po", label: "Purchase order" },
  { key: "invoice", label: "Invoice" },
] as const;
export type DocKind = (typeof DOC_KINDS)[number]["key"];

/** What a new deal needs by default. PO and invoice are turned on when the client asks. */
export const DEFAULT_DOCS: Record<DocKind, DocStatus> = {
  proposal: "pending", nda: "pending", msa: "pending", sow: "pending", po: "not_needed", invoice: "not_needed",
};
/** Signed once with a company, these cover later deals with it too. */
export const COMPANY_WIDE_DOCS: readonly DocKind[] = ["nda", "msa"];

export const DOC_STATUSES = [
  { key: "not_needed", label: "Not needed" },
  { key: "pending", label: "Not started" },
  { key: "drafting", label: "Drafting" },
  { key: "sent", label: "Sent" },
  { key: "client_review", label: "Client reviewing" },
  { key: "signed", label: "Signed" },
] as const;
export type DocStatus = (typeof DOC_STATUSES)[number]["key"];

export const BUYING_ROLES = [
  { key: "decision_maker", label: "Decision maker" },
  { key: "champion", label: "Champion (pushing for us)" },
  { key: "hr_ld", label: "HR / L&D" },
  { key: "finance", label: "Finance / purchasing" },
  { key: "legal_signer", label: "Signs the contract" },
  { key: "other", label: "Other" },
] as const;

export const B2B_SOURCES = [
  { key: "outbound", label: "We reached out" },
  { key: "inbound", label: "They reached out" },
  { key: "referral", label: "Referral" },
  { key: "event", label: "Event" },
  { key: "partner", label: "Partner" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "other", label: "Other" },
] as const;

export const ACTIVITY_KINDS = [
  { key: "call", label: "Call" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "email", label: "Email" },
  { key: "meeting", label: "Meeting" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "note", label: "Note" },
] as const;

export const PAYMENT_TERMS = [
  { key: "advance", label: "100% advance" },
  { key: "split_50_50", label: "50% advance, 50% on completion" },
  { key: "milestones", label: "Milestones" },
  { key: "net_30", label: "Net 30" },
  { key: "net_45", label: "Net 45" },
  { key: "other", label: "Other" },
] as const;

export const PAYMENT_STATUSES = [
  { key: "not_due", label: "Not invoiced" },
  { key: "invoiced", label: "Invoiced" },
  { key: "part_paid", label: "Part paid" },
  { key: "paid", label: "Paid" },
] as const;

export const DELIVERY_MODES = [
  { key: "self_paced", label: "Self-paced online" },
  { key: "live_online", label: "Live online" },
  { key: "onsite", label: "On-site" },
  { key: "hybrid", label: "Hybrid" },
] as const;

export const EMPLOYEE_SIZES = ["1-50", "51-200", "201-1000", "1001-5000", "5000+"] as const;

type Option = { key: string };
const has = (list: readonly Option[], v: unknown): v is string => typeof v === "string" && list.some((x) => x.key === v);
export const isB2BStage = (v: unknown): v is B2BStage => has(B2B_STAGES, v);
export const isDocKind = (v: unknown): v is DocKind => has(DOC_KINDS, v);
export const isDocStatus = (v: unknown): v is DocStatus => has(DOC_STATUSES, v);
export const isOneOf = (list: readonly Option[], v: unknown): v is string => has(list, v);

export const winChance = (stage: string) => B2B_STAGES.find((s) => s.key === stage)?.win ?? 0;
/** Value × win chance, in rupees. */
export const weighted = (value: number, stage: string) => Math.round((value * winChance(stage)) / 100);

/**
 * The deal's total. With a per-seat price it is seats × price − discount (never
 * below zero); without one, the amount typed in stands.
 */
export function dealValue(p: { seats: number; pricePerSeat: number | null; discount: number; typed: number }): number {
  if (p.pricePerSeat === null) return Math.max(0, Math.floor(p.typed));
  return Math.max(0, Math.floor(p.seats * p.pricePerSeat - p.discount));
}

/** The documents still open: neither signed nor marked not needed. */
export function pendingDocs(docs: { kind: string; status: string }[]): string[] {
  const order = (k: string) => DOC_KINDS.findIndex((d) => d.key === k);
  return docs.filter((d) => d.status !== "signed" && d.status !== "not_needed").map((d) => d.kind).sort((a, b) => order(a) - order(b));
}

/** Why a deal can't be marked signed yet, or null when it can. */
export function signBlocked(docs: { kind: string; status: string }[]): string | null {
  const open = pendingDocs(docs);
  if (!open.length) return null;
  const names = open.map((k) => DOC_KINDS.find((d) => d.key === k)?.label ?? k);
  return `Sign ${names.join(", ")} first, or mark ${open.length === 1 ? "it" : "them"} not needed.`;
}

/** Whole days between two YYYY-MM-DD dates (or ISO timestamps, read in IST). */
export function daysBetween(from: string, to: string): number {
  const day = (v: string) => (v.length === 10 ? v : new Date(v).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }));
  return Math.round((Date.parse(`${day(to)}T00:00:00Z`) - Date.parse(`${day(from)}T00:00:00Z`)) / 86_400_000);
}

export interface Attention { overdue: boolean; noNextStep: boolean; stale: boolean }

/** What's wrong with an open deal: a late or missing next step, or no contact for STALE_DAYS. */
export function attention(d: { stage: string; next_step: string | null; next_step_date: string | null; last_activity_at: string | null; stage_changed_at: string; created_at: string }, today = istToday()): Attention {
  if (!isOpenStage(d.stage)) return { overdue: false, noNextStep: false, stale: false };
  const last = [d.last_activity_at, d.stage_changed_at, d.created_at].filter((x): x is string => !!x).sort().at(-1)!;
  return {
    overdue: d.next_step_date !== null && d.next_step_date < today,
    noNextStep: !d.next_step || !d.next_step_date,
    stale: d.stage !== "on_hold" && daysBetween(last, today) >= STALE_DAYS,
  };
}

/** ₹12,34,567 without paise; ₹1.2 Cr and ₹4.5 L when short. */
export function inr(amount: number, short = false): string {
  if (short && amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(amount >= 10_00_00_000 ? 0 : 1).replace(/\.0$/, "")} Cr`;
  if (short && amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(amount >= 10_00_000 ? 0 : 1).replace(/\.0$/, "")} L`;
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

/** The first day of the IST quarter that holds `day`, and of the next one. */
export function quarterOf(day: string): { start: string; end: string } {
  const [y, m] = day.split("-").map(Number);
  // Indian financial quarters: Apr–Jun, Jul–Sep, Oct–Dec, Jan–Mar.
  const startMonth = m >= 4 ? 4 + 3 * Math.floor((m - 4) / 3) : 1;
  const s = new Date(Date.UTC(y, startMonth - 1, 1));
  const e = new Date(Date.UTC(y, startMonth - 1 + 3, 1));
  return { start: s.toISOString().slice(0, 10), end: e.toISOString().slice(0, 10) };
}

/** A web address with https:// added when it was typed bare, or null. */
export function cleanUrl(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  const s = v.trim();
  const url = /^https?:\/\//i.test(s) ? s.replace(/^http:/i, "https:") : `https://${s}`;
  try {
    const u = new URL(url);
    return u.hostname.includes(".") && url.length <= 2000 ? url : null;
  } catch {
    return null;
  }
}

/** An Indian GSTIN: 15 characters, upper-cased, spaces dropped. */
export function cleanGstin(v: unknown): string | null | false {
  if (typeof v !== "string" || !v.trim()) return null;
  const s = v.replace(/\s/g, "").toUpperCase();
  return /^[0-9]{2}[A-Z0-9]{13}$/.test(s) ? s : false;
}
