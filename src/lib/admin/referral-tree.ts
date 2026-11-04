/** One completed payment, as much of it as the tree needs. */
export interface ReferralPayment { email: string; referred_by: string | null; status: string; amount: number; created_at: string; friends?: number | null }

export interface ReferralNode {
  email: string;
  /** Null when someone was named as a referrer but has no payment on record. */
  payment: ReferralPayment | null;
  /** Everyone they brought, oldest first. */
  children: ReferralNode[];
  /** Everyone below them, at any depth. */
  total: number;
}

/**
 * Who referred whom, as trees. Only people in a referral appear: a buyer nobody
 * referred, who referred nobody, is left out. A person's latest payment stands
 * for them, so buying again after a refund doesn't list them twice. A loop in
 * the data can't hang it or drop anyone: each person appears once.
 */
export function referralTree(payments: ReferralPayment[]): ReferralNode[] {
  const oldestFirst = [...payments].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const latest = new Map(oldestFirst.map((p) => [p.email, p]));
  const childrenOf = new Map<string, string[]>();
  for (const p of latest.values()) {
    if (p.referred_by && p.referred_by !== p.email) childrenOf.set(p.referred_by, [...(childrenOf.get(p.referred_by) ?? []), p.email]);
  }
  const hasParent = new Set([...childrenOf.values()].flat());
  const seen = new Set<string>();
  const build = (email: string): ReferralNode => {
    seen.add(email);
    const children = (childrenOf.get(email) ?? []).filter((c) => !seen.has(c)).map(build);
    return { email, payment: latest.get(email) ?? null, children, total: children.reduce((n, c) => n + 1 + c.total, 0) };
  };
  const roots = [...childrenOf.keys()].filter((e) => !hasParent.has(e)).map(build);
  // Whoever is left is in a loop, with no top to start from.
  for (const email of childrenOf.keys()) if (!seen.has(email)) roots.push(build(email));
  return roots.sort((a, b) => b.total - a.total || a.email.localeCompare(b.email));
}
