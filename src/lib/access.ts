import "server-only";
import { dayLockFor } from "@/lib/day-lock";
import { createServiceClient } from "@/lib/supabase/admin";

/**
 * Day 1 is free on every paid track; Days 2 to 30 need a paid seat. Free
 * tracks open everything. Fails open on a database error, so an outage never
 * locks a paying learner out.
 */
export async function hasPaid(email: string, track: string) {
  const supabase = createServiceClient();
  if (!supabase) return true;
  // For this track only: paying for a cheaper track never unlocks a dearer one.
  const { data, error } = await supabase.from("payments").select("id").eq("email", email).eq("track", track).eq("status", "paid").limit(1);
  if (error) return true;
  return !!data?.length;
}

export type { DayLock } from "@/lib/day-lock";

/** The day lock for a learner, with their payment looked up only when it matters. */
export async function dayLock({ email, track, price, day, submittedDays }: { email: string; track: string; price: number; day: number; submittedDays: number[] }) {
  const needsPayment = price > 0 && day > 1 && !submittedDays.includes(day);
  return dayLockFor({ day, price, paid: needsPayment ? await hasPaid(email, track) : true, submittedDays });
}
