import type { Delivery, LinkState } from "@/lib/company/batch-rules";

/**
 * How the hiring screens sort batches and candidates into the filters a
 * recruiter clicks. Free of the database, React and Next so it can be tested;
 * the screens compute these on the server and filter in the browser.
 */

// ── Batches ─────────────────────────────────────────────────

export type BatchStateKey = "open" | "later" | "draft" | "closed" | "cancelled";

export const BATCH_STATE_LABEL: Record<BatchStateKey, string> = {
  open: "Open",
  later: "Opens later",
  draft: "Draft",
  closed: "Closed",
  cancelled: "Cancelled",
};

/** The filters on the batch list, in order, with the plural name a filter reads as. */
export const BATCH_FILTERS: readonly { key: "all" | BatchStateKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "later", label: "Opens later" },
  { key: "draft", label: "Drafts" },
  { key: "closed", label: "Closed" },
  { key: "cancelled", label: "Cancelled" },
];

/** Where a batch stands right now. */
export function batchStateKey(b: { status: "draft" | "sent" | "cancelled"; opensAt: string | Date; closesAt: string | Date }, now: Date): BatchStateKey {
  if (b.status === "cancelled") return "cancelled";
  if (b.status === "draft") return "draft";
  if (now > new Date(b.closesAt)) return "closed";
  if (now < new Date(b.opensAt)) return "later";
  return "open";
}

export type BatchSort = "newest" | "opens" | "closes";

/** Batches matching a filter and a search (role or test, any case), in the chosen order. */
export function pickBatches<T extends { state: BatchStateKey; role: string; title: string; createdAt: string; opensAt: string; closesAt: string }>(
  all: readonly T[],
  filter: "all" | BatchStateKey,
  query: string,
  sort: BatchSort,
): T[] {
  const q = query.trim().toLowerCase();
  const shown = all.filter((b) => (filter === "all" || b.state === filter) && (!q || b.role.toLowerCase().includes(q) || b.title.toLowerCase().includes(q)));
  const by = sort === "opens" ? "opensAt" : sort === "closes" ? "closesAt" : "createdAt";
  const dir = sort === "newest" ? -1 : 1;
  return [...shown].sort((a, b) => dir * (new Date(a[by]).getTime() - new Date(b[by]).getTime()));
}

// ── Candidates ──────────────────────────────────────────────

export type CandidateFilter = "all" | "open" | "later" | "sent" | "failed" | "unsent" | "passed" | "cancelled";

/** The filters on a batch's candidate table, in order. A person can match several. */
export const CANDIDATE_FILTERS: readonly { key: CandidateFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Can start" },
  { key: "later", label: "Opens later" },
  { key: "sent", label: "Sent" },
  { key: "failed", label: "Failed" },
  { key: "unsent", label: "Not sent" },
  { key: "passed", label: "Start passed" },
  { key: "cancelled", label: "Cancelled" },
];

/** Which filters one person falls under. */
export function candidateTags(c: { active: boolean; delivery: Delivery; link: LinkState }): CandidateFilter[] {
  if (!c.active || c.link === "cancelled" || c.link === "batch_cancelled") return ["all", "cancelled"];
  const tags: CandidateFilter[] = ["all"];
  if (c.link === "open") tags.push("open");
  if (c.link === "not_open") tags.push("later");
  if (c.link === "missed") tags.push("passed");
  if (c.delivery === "sent") tags.push("sent");
  if (c.delivery === "failed" || c.delivery === "skipped") tags.push("failed");
  if (c.delivery === "pending") tags.push("unsent");
  return tags;
}

/** People matching a filter and a search (name or email, any case). */
export function pickCandidates<T extends { tags: readonly CandidateFilter[]; name: string; email: string }>(all: readonly T[], filter: CandidateFilter, query: string): T[] {
  const q = query.trim().toLowerCase();
  return all.filter((c) => c.tags.includes(filter) && (!q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)));
}

/** How many people each filter holds. */
export function countBy<K extends string>(all: readonly { tags: readonly K[] }[], keys: readonly K[]): Record<K, number> {
  const out = Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
  for (const c of all) for (const t of c.tags) if (t in out) out[t] += 1;
  return out;
}
