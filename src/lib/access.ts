import "server-only";
import { LAUNCH_OFFER } from "@/lib/offer";
import { createServiceClient } from "@/lib/supabase/admin";

/**
 * Day 1 is free on every paid track; Days 2 to 30 need a paid seat. Free
 * tracks open everything. Fails open on a database error, so an outage never
 * locks a paying learner out.
 */
export async function hasPaid(email: string) {
  const supabase = createServiceClient();
  if (!supabase) return true;
  const { data, error } = await supabase.from("payments").select("id").eq("email", email).eq("status", "paid").limit(1);
  if (error) return true;
  return !!data?.length;
}

export async function canOpenDay({ email, price, day }: { email: string; price: number; day: number }) {
  if (price <= 0 || day <= 1) return true;
  return hasPaid(email);
}

/** Paid seats taken since the launch offer began. */
export async function launchSeatsTaken() {
  const supabase = createServiceClient();
  if (!supabase) return 0;
  const { count } = await supabase
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("status", "paid")
    .gte("created_at", LAUNCH_OFFER.startsAt);
  return count ?? 0;
}
