import { EmptyState } from "@/components/admin/EmptyState";
import { PageTitle } from "@/components/admin/PageTitle";
import { StatTile } from "@/components/admin/StatTile";
import { requireAdmin } from "@/lib/admin/auth";
import { getPayments } from "@/lib/admin/data";
import { referralTree, type ReferralNode } from "@/lib/admin/referral-tree";
import { formatINR } from "@/lib/format";
import { SD_REFERRAL } from "@/lib/sd-offer";

const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });

function Person({ node }: { node: ReferralNode }) {
  const p = node.payment;
  return (
    <li className="mt-2">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
        <span className="font-bold break-all">{node.email}</span>
        <span className="text-xs text-muted">
          {p ? `${formatINR(p.amount / 100)} · ${day(p.created_at)}` : "No payment on record"}
          {p?.status === "refunded" && " · Refunded"}
        </span>
        {node.children.length > 0 && <span className="text-xs font-bold">Brought {node.children.length}{node.total > node.children.length ? `, ${node.total} in all` : ""}</span>}
        {(p?.friends ?? 0) >= SD_REFERRAL.friends && <span className="rounded bg-ink px-1.5 py-px text-[11px] font-bold text-paper">Earned refund</span>}
      </div>
      {node.children.length > 0 && (
        <ul className="m-0 ml-1.5 list-none border-l-2 border-line/40 pl-4">
          {node.children.map((c) => <Person key={c.email} node={c} />)}
        </ul>
      )}
    </li>
  );
}

export default async function AdminReferralsPage() {
  await requireAdmin();
  const trees = referralTree(await getPayments());
  const referred = trees.reduce((n, t) => n + t.total, 0);
  const earned = (nodes: ReferralNode[]): number => nodes.reduce((n, t) => n + ((t.payment?.friends ?? 0) >= SD_REFERRAL.friends ? 1 : 0) + earned(t.children), 0);
  return (
    <>
      <PageTitle eyebrow="System Design" title="Referrals" intro="Who referred whom, from completed payments. Biggest tree first, and friends of friends sit under the person who brought them." />
      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <StatTile label="Trees" value={trees.length} hint="People who started a chain" />
        <StatTile label="Bought through a referral" value={referred} hint="At any depth" />
        <StatTile label="Earned a refund" value={earned(trees)} hint={`${SD_REFERRAL.friends} friends within ${SD_REFERRAL.days} days`} tone="red" />
      </div>
      {trees.length === 0 ? (
        <EmptyState title="No referrals yet" body="When someone buys with a friend's link or code, they appear here under that friend." />
      ) : (
        <ul className="card m-0 list-none p-5">
          {trees.map((t) => <Person key={t.email} node={t} />)}
        </ul>
      )}
    </>
  );
}
