import "server-only";
import { HACKATHON } from "@/data/hackathon";
import { db } from "@/lib/db/client";
import { makeTeamCode, type EntryDetails, type MemberDetails } from "@/lib/hackathon-validate";

/** Postgres: no such table. Code can go live before its migration. */
const UNDEFINED_TABLE = "42P01";
const UNIQUE_VIOLATION = "23505";
const EVENT = () => HACKATHON.eventId;

export interface TeamMember { id: string; name: string; email: string; isLeader: boolean }
export interface MyTeam {
  id: string;
  code: string;
  name: string | null;
  members: TeamMember[];
  /** The signed-in person's own row. */
  me: TeamMember;
  entry: (EntryDetails & { updatedAt: string }) | null;
}

function warn(what: string, error: { code?: string } | null) {
  if (error && error.code !== UNDEFINED_TABLE) console.error(`hackathon ${what} failed:`, error.code);
}

/** The signed-in person's team for the current event, or null if they haven't registered. */
export async function myTeam(email: string): Promise<MyTeam | null> {
  const sql = db();
  if (!sql) return null;
  const { data: mine, error } = await sql.row<{ team_id: string }>`
    select team_id from course.hackathon_members where event_id = ${EVENT()} and email = ${email}
  `;
  warn("team read", error);
  if (!mine) return null;
  const [team, members, entry] = await Promise.all([
    sql.row<{ id: string; code: string; name: string | null }>`select id, code, name from course.hackathon_teams where id = ${mine.team_id}`,
    sql.rows<{ id: string; name: string; email: string; is_leader: boolean }>`
      select id, name, email, is_leader from course.hackathon_members where team_id = ${mine.team_id} order by is_leader desc, created_at
    `,
    sql.row<{ brief_id: string; repo_url: string; live_url: string; ai_log_url: string; notes: string | null; updated_at: string }>`
      select brief_id, repo_url, live_url, ai_log_url, notes, updated_at from course.hackathon_entries where team_id = ${mine.team_id}
    `,
  ]);
  if (!team.data) return null;
  const list = (members.data ?? []).map((m) => ({ id: m.id, name: m.name, email: m.email, isLeader: m.is_leader }));
  const e = entry.data;
  return {
    ...team.data,
    members: list,
    me: list.find((m) => m.email === email)!,
    entry: e ? { briefId: e.brief_id, repoUrl: e.repo_url, liveUrl: e.live_url, aiLogUrl: e.ai_log_url, notes: e.notes ?? "", updatedAt: new Date(e.updated_at).toISOString() } : null,
  };
}

type Outcome = { ok: true } | { ok: false; message: string };

/** Starts a team, with them as its leader. A solo entry is a team of one. */
export async function createTeam(email: string, details: MemberDetails, teamName: string): Promise<Outcome> {
  const sql = db();
  if (!sql) return { ok: false, message: "Registration is not available right now." };
  // A fresh code, tried again on the rare clash.
  for (let tries = 0; tries < 5; tries++) {
    const { data: team, error } = await sql.row<{ id: string }>`
      insert into course.hackathon_teams (event_id, code, name) values (${EVENT()}, ${makeTeamCode()}, ${teamName || null})
      returning id
    `;
    if (error?.code === UNIQUE_VIOLATION) continue;
    if (!team) { warn("team create", error); return { ok: false, message: "Registration is not available right now." }; }
    const joined = await addMember(team.id, email, details, true);
    // Already on a team: the empty one just made goes again.
    if (!joined.ok) await sql.run`delete from course.hackathon_teams where id = ${team.id}`;
    return joined;
  }
  return { ok: false, message: "Something went wrong making your team. Please try again." };
}

/** Joins the team with this code, while it has room. */
export async function joinTeam(email: string, details: MemberDetails, code: string): Promise<Outcome> {
  const sql = db();
  if (!sql) return { ok: false, message: "Registration is not available right now." };
  const { data: team, error } = await sql.row<{ id: string }>`
    select id from course.hackathon_teams where event_id = ${EVENT()} and code = ${code}
  `;
  warn("team lookup", error);
  if (!team) return { ok: false, message: "No team has that code. Check it with your team leader." };
  return addMember(team.id, email, details, false);
}

/** One insert that only succeeds while the team has room, so two people joining at once can't make it four. */
async function addMember(teamId: string, email: string, d: MemberDetails, leader: boolean): Promise<Outcome> {
  const sql = db()!;
  const { data, error } = await sql.rows<{ id: string }>`
    insert into course.hackathon_members (event_id, team_id, email, name, phone, college, graduation_year, is_leader)
    select ${EVENT()}, ${teamId}, ${email}, ${d.name}, ${d.phone}, ${d.college}, ${d.graduationYear}, ${leader}
     where (select count(*) from course.hackathon_members where team_id = ${teamId}) < ${HACKATHON.maxTeamSize}
    returning id
  `;
  if (error?.code === UNIQUE_VIOLATION) return { ok: false, message: "You're already registered for this hackathon." };
  if (error) { warn("join", error); return { ok: false, message: "Registration is not available right now." }; }
  if (!data?.length) return { ok: false, message: `That team is full: teams have ${HACKATHON.maxTeamSize} people at most.` };
  return { ok: true };
}

/**
 * Takes someone off a team: the leader removing a teammate, or a member
 * leaving. The leader can't remove themselves; a team that would be left
 * empty goes with them.
 */
export async function removeMember(byEmail: string, memberId: string): Promise<Outcome> {
  const team = await myTeam(byEmail);
  if (!team) return { ok: false, message: "You're not on a team." };
  const target = team.members.find((m) => m.id === memberId);
  if (!target) return { ok: false, message: "That person isn't on your team." };
  const self = target.email === byEmail;
  if (!self && !team.me.isLeader) return { ok: false, message: "Only the team leader can remove someone." };
  if (self && team.me.isLeader && team.members.length > 1) return { ok: false, message: "Remove your teammates first, or ask one of them to start their own team." };
  const sql = db()!;
  const { error } = await sql.run`delete from course.hackathon_members where id = ${memberId} and team_id = ${team.id}`;
  if (error) { warn("remove", error); return { ok: false, message: "That didn't work. Please try again." }; }
  if (team.members.length === 1) await sql.run`delete from course.hackathon_teams where id = ${team.id}`;
  return { ok: true };
}

/** Saves the team's submission; any member may, and it can be changed until the deadline. */
export async function saveEntry(email: string, e: EntryDetails): Promise<Outcome> {
  const team = await myTeam(email);
  if (!team) return { ok: false, message: "Register first: entries belong to a team." };
  const sql = db()!;
  const { error } = await sql.run`
    insert into course.hackathon_entries (team_id, brief_id, repo_url, live_url, ai_log_url, notes, submitted_by)
    values (${team.id}, ${e.briefId}, ${e.repoUrl}, ${e.liveUrl}, ${e.aiLogUrl}, ${e.notes || null}, ${email})
    on conflict (team_id) do update set
      brief_id = excluded.brief_id, repo_url = excluded.repo_url, live_url = excluded.live_url,
      ai_log_url = excluded.ai_log_url, notes = excluded.notes, submitted_by = excluded.submitted_by, updated_at = now()
  `;
  if (error) { warn("entry", error); return { ok: false, message: "Your entry could not be saved. Please try again." }; }
  return { ok: true };
}

/** "Tell me when it opens." */
export async function addInterest(email: string): Promise<boolean> {
  const sql = db();
  if (!sql) return false;
  const { error } = await sql.run`
    insert into course.hackathon_interest (event_id, email) values (${EVENT()}, ${email}) on conflict do nothing
  `;
  warn("interest", error);
  return !error;
}

export async function hasInterest(email: string): Promise<boolean> {
  const sql = db();
  if (!sql) return false;
  const { data } = await sql.row<{ one: number }>`
    select 1 as one from course.hackathon_interest where event_id = ${EVENT()} and email = ${email}
  `;
  return !!data;
}

export interface PublicResult { place: number; teamId: string; title: string; team: string; members: string[]; liveUrl: string | null; repoUrl: string | null }

/** The published winners, best first. Empty until an admin publishes them. */
export async function publishedResults(): Promise<PublicResult[]> {
  const sql = db();
  if (!sql) return [];
  const { data, error } = await sql.rows<{ place: number; team_id: string; title: string; name: string | null; code: string; members: string[]; live_url: string | null; repo_url: string | null }>`
    select r.place, r.team_id, r.title, t.name, t.code,
           array(select m.name from course.hackathon_members m where m.team_id = t.id order by m.is_leader desc, m.created_at) as members,
           e.live_url, e.repo_url
      from course.hackathon_results r
      join course.hackathon_teams t on t.id = r.team_id
      left join course.hackathon_entries e on e.team_id = t.id
     where r.event_id = ${EVENT()} and r.published_at is not null
     order by r.place
  `;
  warn("results read", error);
  return (data ?? []).map((r) => ({ place: r.place, teamId: r.team_id, title: r.title, team: r.name || r.members[0] || r.code, members: r.members, liveUrl: r.live_url, repoUrl: r.repo_url }));
}
