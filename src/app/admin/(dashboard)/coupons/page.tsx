import { CouponsAdmin, type CouponRow } from "@/components/admin/CouponsAdmin";
import { EmptyState } from "@/components/admin/EmptyState";
import { PageTitle } from "@/components/admin/PageTitle";
import { requireOwner } from "@/lib/admin/auth";
import { db } from "@/lib/db/client";
import { SD_OFFER } from "@/lib/sd-offer";
import { site } from "@/data/config";

export default async function CouponsPage() {
  await requireOwner();
  const sql = db();
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
        <CouponsAdmin rows={data ?? []} siteUrl={site.url} />
      )}
    </>
  );
}
