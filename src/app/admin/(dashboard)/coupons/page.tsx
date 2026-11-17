import Link from "next/link";
import { CouponsAdmin, type CouponRow } from "@/components/admin/CouponsAdmin";
import { EmptyState } from "@/components/admin/EmptyState";
import { PageTitle } from "@/components/admin/PageTitle";
import { requireOwner } from "@/lib/admin/auth";
import { db } from "@/lib/db/client";
import { SD_OFFER } from "@/lib/sd-offer";
import { site } from "@/data/config";

const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** How far someone got on the offer page, furthest first. */
const FURTHEST: [string, string][] = [
  ["paid", "Paid"], ["rzp_failed", "Payment failed"], ["rzp_closed", "Closed Razorpay"], ["rzp_open", "Opened Razorpay"], ["order_failed", "Order failed"],
  ["google", "Went to sign in"], ["claim", "Tapped Claim"], ["blocked", "Told to leave Instagram's browser"], ["coupon", "Applied the code"], ["form_start", "Started the form"], ["view", "Opened the page"],
];
const furthest = (steps: string[]) => FURTHEST.find(([k]) => steps.includes(k))?.[1] ?? "Opened the page";

interface Opener { code: string; anon_id: string; email: string | null; first_at: string; last_at: string; steps: string[]; city: string | null; country: string | null; in_app: boolean }

export default async function CouponsPage() {
  await requireOwner();
  const sql = db();
  // Everyone whose offer-page activity carries a coupon code, one row per code and browser.
  const openers = sql
    ? ((await sql.rows<Opener>`
        select props->>'coupon' as code, anon_id, max(email) as email, min(created_at) as first_at, max(created_at) as last_at,
               array_agg(distinct step) as steps, max(props->>'city') as city, max(props->>'country') as country,
               bool_or(coalesce((props->>'inApp')::boolean, false)) as in_app
          from course.sd_events
         where event = 'offer' and props ? 'coupon' and created_at > now() - interval '180 days'
         group by 1, 2
         order by max(created_at) desc
         limit 1000
      `).data ?? [])
    : [];
  const byCode = new Map<string, Opener[]>();
  for (const o of openers) byCode.set(o.code, [...(byCode.get(o.code) ?? []), o]);
  const { data, error } = sql
    ? await sql.rows<CouponRow>`
        select c.code, c.price, c.max_uses, c.ends_at, c.paused_at, c.note, c.created_by, c.created_at,
               (select count(*)::int from course.payments p where p.coupon_code = c.code and p.status = 'paid') as used
          from course.sd_coupons c order by c.created_at desc limit 200
      `
    : { data: null, error: null };

  return (
    <>
      <PageTitle
        eyebrow="System Design"
        title="Coupons"
        intro={`Make a code that sets the System Design price below ₹${SD_OFFER.full.toLocaleString("en-IN")}. Buyers type it at checkout, or open its link, which fills it in. It works alongside a friend's referral code. Uses count paid orders only. Owners only; every change is in Admin activity.`}
      />
      {error?.code === "42P01" ? (
        <EmptyState title="Coupons aren't set up yet" body="Run db/migrations/0039_sd_coupons.sql in the Neon SQL editor once, then reload this page." />
      ) : (
        <>
          <CouponsAdmin rows={(data ?? []).map((r) => ({ ...r, opened: byCode.get(r.code)?.length ?? 0 }))} siteUrl={site.url} />
          <section className="mt-10" aria-labelledby="opened-title">
            <h2 id="opened-title" className="mb-1 text-lg font-extrabold">Who opened each link</h2>
            <p className="mb-4 text-sm text-muted">Everyone who opened the offer page with a code, newest first, and how far they got. Open a trail to see everything they did. People who turned analytics off in the cookie banner aren&apos;t counted.</p>
            {byCode.size === 0 ? (
              <p className="card px-4 py-6 text-center text-sm text-muted">No one has opened a coupon link yet.</p>
            ) : (
              [...byCode.entries()].map(([code, people]) => (
                <div key={code} id={`opened-${code}`} className="card mb-4 overflow-x-auto">
                  <p className="border-b border-line/25 px-4 py-2.5 text-sm"><span className="font-mono font-bold">{code}</span> · {people.length} {people.length === 1 ? "person" : "people"} · {people.filter((p) => p.steps.includes("paid")).length} paid</p>
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="text-xs uppercase tracking-wider text-muted">
                      <tr><th className="px-4 py-2">Who</th><th className="px-4 py-2">First opened</th><th className="px-4 py-2">Got as far as</th><th className="px-4 py-2">Last seen</th><th className="px-4 py-2" /></tr>
                    </thead>
                    <tbody className="divide-y divide-line/20">
                      {people.map((p) => (
                        <tr key={p.anon_id}>
                          <td className="px-4 py-2.5">
                            <div className="font-semibold">{p.email ?? "Not signed in"}</div>
                            <div className="text-xs text-muted">{[p.city, p.country].filter(Boolean).join(", ") || "Place unknown"}{p.in_app ? " · Instagram's browser" : ""}</div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-xs">{when(p.first_at)}</td>
                          <td className={`whitespace-nowrap px-4 py-2.5 text-xs font-semibold ${p.steps.includes("paid") ? "text-emerald-700" : ""}`}>{furthest(p.steps)}</td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-xs">{when(p.last_at)}</td>
                          <td className="px-4 py-2.5 text-xs"><Link href={`/admin/system-design?learner=${p.anon_id}`} className="font-bold underline">Trail →</Link></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
            )}
          </section>
        </>
      )}
    </>
  );
}
