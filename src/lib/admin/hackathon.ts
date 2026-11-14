import "server-only";
import { HACKATHON } from "@/data/hackathon";
import { db } from "@/lib/db/client";

/** Postgres: no such table. Code can go live before its migration. */
const UNDEFINED_TABLE = "42P01";

export interface AdminTeam {
  id: string;
  code: string;
  name: string | null;
  members: { name: string; email: string; college: string; isLeader: boolean }[];
  entry: { briefId: string; repoUrl: string; liveUrl: string; aiLogUrl: string; notes: string | null; updatedAt: string } | null;
  /** This judge's marks, if they have scored it. */
  mine: { product: number; prompting: number; polish: number; comment: string | null } | null;
  /** The mean of every judge's total out of 30, and how many judges. */
  average: number | null;
  judges: number;
  place: number | null;
}

/** Every team of the current event with its entry and scores, best average first. Admin only: the caller checks. */
export async function adminTeams(judgeEmail: string): Promise<{ teams: AdminTeam[]; interest: number; published: boolean }> {
  const sql = db();
  if (!sql) return { teams: [], interest: 0, published: false };
  const event = HACKATHON.eventId;
  const [teams, members, entries, scores, results, interest] = await Promise.all([
    sql.rows<{ id: string; code: string; name: string | null }>`select id, code, name from course.hackathon_teams where event_id = ${event} order by created_at`,
    sql.rows<{ team_id: string; name: string; email: string; college: string; is_leader: boolean }>`
      select team_id, name, email, college, is_leader from course.hackathon_members where event_id = ${event} order by is_leader desc, created_at
    `,
    sql.rows<{ team_id: string; brief_id: string; repo_url: string; live_url: string; ai_log_url: string; notes: string | null; updated_at: string }>`
      select e.team_id, e.brief_id, e.repo_url, e.live_url, e.ai_log_url, e.notes, e.updated_at
        from course.hackathon_entries e join course.hackathon_teams t on t.id = e.team_id where t.event_id = ${event}
    `,
    sql.rows<{ team_id: string; judge_email: string; product: number; prompting: number; polish: number; comment: string | null }>`
      select s.team_id, s.judge_email, s.product, s.prompting, s.polish, s.comment
        from course.hackathon_scores s join course.hackathon_teams t on t.id = s.team_id where t.event_id = ${event}
    `,
    sql.rows<{ team_id: string; place: number; published_at: string | null }>`select team_id, place, published_at from course.hackathon_results where event_id = ${event}`,
    sql.scalar<number>`select count(*)::int from course.hackathon_interest where event_id = ${event}`,
  ]);
  for (const r of [teams, members, entries, scores, results]) if (r.error && r.error.code !== UNDEFINED_TABLE) console.error("admin hackathon read failed:", r.error.code);

  const list: AdminTeam[] = (teams.data ?? []).map((t) => {
    const s = (scores.data ?? []).filter((x) => x.team_id === t.id);
    const e = (entries.data ?? []).find((x) => x.team_id === t.id);
    const mine = s.find((x) => x.judge_email === judgeEmail);
    return {
      ...t,
      members: (members.data ?? []).filter((m) => m.team_id === t.id).map((m) => ({ name: m.name, email: m.email, college: m.college, isLeader: m.is_leader })),
      entry: e ? { briefId: e.brief_id, repoUrl: e.repo_url, liveUrl: e.live_url, aiLogUrl: e.ai_log_url, notes: e.notes, updatedAt: new Date(e.updated_at).toISOString() } : null,
      mine: mine ? { product: mine.product, prompting: mine.prompting, polish: mine.polish, comment: mine.comment } : null,
      average: s.length ? Math.round((s.reduce((n, x) => n + x.product + x.prompting + x.polish, 0) / s.length) * 10) / 10 : null,
      judges: s.length,
      place: (results.data ?? []).find((r) => r.team_id === t.id)?.place ?? null,
    };
  });
  list.sort((a, b) => (b.average ?? -1) - (a.average ?? -1));
  return { teams: list, interest: interest.data ?? 0, published: (results.data ?? []).some((r) => r.published_at) };
}

export async function saveScore(judgeEmail: string, teamId: string, m: { product: number; prompting: number; polish: number; comment: string }) {
  const sql = db();
  if (!sql) return false;
  const { error } = await sql.run`
    insert into course.hackathon_scores (team_id, judge_email, product, prompting, polish, comment)
    values (${teamId}, ${judgeEmail}, ${m.product}, ${m.prompting}, ${m.polish}, ${m.comment || null})
    on conflict (team_id, judge_email) do update set
      product = excluded.product, prompting = excluded.prompting, polish = excluded.polish, comment = excluded.comment, updated_at = now()
  `;
  if (error) console.error("hackathon score save failed:", error.code);
  return !error;
}

/**
 * Sets the winners: places 1 to 3 (or fewer), each a team of this event. With
 * `publish` they show on the public page; without, they are saved as a draft.
 */
export async function saveResults(places: { place: number; teamId: string; title: string }[], publish: boolean) {
  const sql = db();
  if (!sql) return false;
  const event = HACKATHON.eventId;
  const { error: cleared } = await sql.run`delete from course.hackathon_results where event_id = ${event}`;
  if (cleared) { console.error("hackathon results clear failed:", cleared.code); return false; }
  for (const p of places) {
    const { error } = await sql.run`
      insert into course.hackathon_results (event_id, place, team_id, title, published_at)
      select ${event}, ${p.place}, t.id, ${p.title}, ${publish ? new Date().toISOString() : null}::timestamptz
        from course.hackathon_teams t where t.id = ${p.teamId} and t.event_id = ${event}
    `;
    if (error) { console.error("hackathon result save failed:", error.code); return false; }
  }
  return true;
}
