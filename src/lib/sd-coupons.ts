import type { Db } from "@/lib/db/client";

/**
 * Coupon codes for the System Design course, made by an owner in
 * /admin/coupons. A code sets the price; the server checks it when the order
 * is made, so the amount can't be edited on the way. The pure parts are here
 * with the one query, so the page, the order and the admin agree.
 */

export interface Coupon {
  code: string;
  price: number;
  max_uses: number | null;
  ends_at: string | null;
  paused_at: string | null;
  /** Paid payments made with this code. */
  used: number;
}

/** A typed code, cleaned: 4 to 20 letters and digits, upper case. Anything else is no code. */
export function couponOf(value: unknown) {
  const code = typeof value === "string" ? value.trim().toUpperCase() : "";
  return /^[A-Z0-9]{4,20}$/.test(code) ? code : null;
}

/** What's wrong with the optional field before it's sent, if anything. Blank is fine. */
export function couponCodeProblem(value: string) {
  return !value.trim() || couponOf(value) ? null : "Check the coupon code, or leave it blank.";
}

/** Why this coupon can't be used right now, if anything. */
export function couponProblem(c: Coupon | null, now: Date = new Date()) {
  if (!c) return "That coupon code isn't valid. Check it, or leave it blank.";
  if (c.paused_at) return "That coupon code isn't active right now.";
  if (c.ends_at && now.getTime() >= new Date(c.ends_at).getTime()) return "That coupon code has expired.";
  if (c.max_uses !== null && c.used >= c.max_uses) return "That coupon code has been fully used.";
  return null;
}

/** What they pay with a coupon: its price, and never more than they'd pay without it. */
export const withCoupon = (price: number, coupon: { price: number } | null) => (coupon ? Math.min(price, coupon.price) : price);

/** The last moment a code works, from the admin's date: the end of that day in India. */
export const endOfDayIST = (date: string) => (/^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T23:59:59+05:30` : null);

/** One coupon with how often it's been paid with. `error.code` 42P01 means the migration hasn't run. */
export function findCoupon(sql: Db, code: string) {
  return sql.row<Coupon>`
    select c.code, c.price, c.max_uses, c.ends_at, c.paused_at,
           (select count(*)::int from course.payments p where p.coupon_code = c.code and p.status = 'paid') as used
      from course.sd_coupons c where c.code = ${code}
  `;
}
