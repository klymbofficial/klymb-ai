import "server-only";
import { LESSON_DAYS } from "@/data/system-design/course-app";
import { getAdmin } from "@/lib/admin/auth";
import { summarise, type SdEventRow, type SdFeedbackRow, type SdSummary } from "@/lib/sd-summary";
import { createServiceClient } from "@/lib/supabase/admin";

const COLS = "created_at, anon_id, email, event, lesson, step, props, lang, device";
const PAGE = 1000;
const MAX_PAGES = 40;

export type SdAnalytics = (SdSummary & { ok: true }) | { ok: false; reason: "no-db" | "no-table" };

/** System Design course activity for the last `days` days (newest 40k events at most). */
export async function getSdAnalytics(days: number): Promise<SdAnalytics> {
  if (!(await getAdmin())) return { ok: false, reason: "no-db" };
  const supabase = createServiceClient();
  if (!supabase) return { ok: false, reason: "no-db" };
  const since = new Date(Date.now() - days * 864e5).toISOString();

  const events: SdEventRow[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await supabase.from("sd_events").select(COLS).gte("created_at", since).order("created_at", { ascending: true }).range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) return { ok: false, reason: "no-table" };
    events.push(...((data ?? []) as SdEventRow[]));
    if (!data || data.length < PAGE) break;
  }
  const { data: feedback } = await supabase.from("sd_feedback").select("created_at, anon_id, email, lesson, rating, clarity, will_finish, improve, lang").gte("created_at", since).order("created_at", { ascending: false });
  return { ok: true, ...summarise(events, (feedback ?? []) as SdFeedbackRow[], LESSON_DAYS) };
}

/** Everything one learner did, oldest first. */
export async function getSdLearner(anon: string): Promise<SdEventRow[]> {
  if (!(await getAdmin()) || !/^[a-zA-Z0-9-]{8,64}$/.test(anon)) return [];
  const supabase = createServiceClient();
  if (!supabase) return [];
  const { data } = await supabase.from("sd_events").select(COLS).eq("anon_id", anon).order("created_at", { ascending: true }).limit(1000);
  return (data ?? []) as SdEventRow[];
}
