/**
 * The System Design lesson Q&A: shared by the API, which validates and shapes
 * it, and the course app, which shows it. Nothing here touches the database.
 */

export const QNA_MAX = 2000;
/** One page of questions per lesson; a lesson with more than this needs search, not scrolling. */
export const QNA_PAGE = 50;

export interface QnaReply { id: string; name: string; staff: boolean; mine: boolean; body: string; at: string }
export interface QnaQuestion extends QnaReply { replies: QnaReply[] }
export interface QnaFeed { questions: QnaQuestion[]; canPost: boolean; admin: boolean }

/** A row as the API reads it, email included; the email never leaves the server. */
export interface QnaRow {
  id: string;
  created_at: string;
  parent_id: string | null;
  email: string;
  name: string;
  staff: boolean;
  body: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

/** Trimmed, with runs of blank lines collapsed; empty means "nothing to post". */
export function cleanBody(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, QNA_MAX);
}

/** "Priya S.": a first name and an initial is enough for a lesson chat, and no more is shown to strangers. */
export function displayName(name: string | null | undefined, email: string): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return email.split("@")[0].slice(0, 20) || "Learner";
  const first = parts[0].slice(0, 30);
  return parts.length > 1 ? `${first} ${parts[parts.length - 1][0].toUpperCase()}.` : first;
}

/** Questions newest first, each with its replies oldest first; replies without a question are dropped. */
export function toFeed(rows: QnaRow[], viewer: string | null): QnaQuestion[] {
  const shape = (r: QnaRow): QnaReply => ({ id: r.id, name: r.name, staff: r.staff, mine: !!viewer && r.email === viewer, body: r.body, at: r.created_at });
  const questions = rows
    .filter((r) => !r.parent_id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((r) => ({ ...shape(r), replies: [] as QnaReply[] }));
  const byId = new Map(questions.map((q) => [q.id, q]));
  for (const r of [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    if (r.parent_id) byId.get(r.parent_id)?.replies.push(shape(r));
  }
  return questions;
}

/** "now", "5m", "3h", "2d", then a date: what a chat shows. */
export function ago(at: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - Date.parse(at)) / 1000));
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h`;
  if (s < 7 * 86_400) return `${Math.floor(s / 86_400)}d`;
  return new Date(at).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
