import "server-only";
import { db } from "@/lib/db/client";

/**
 * What earlier sessions left behind.
 *
 * Read in two places and so kept in one: the coach page shows the learner
 * their own record, and /api/coach/session uses the same answers to pick the
 * next topic and to tell the coach what has already been covered.
 */

export interface CoachSessionRecord {
  id: string;
  created_at: string;
  topic: string;
  summary: string | null;
  first_reply_ms: number | null;
  /** Rows of evidence recorded during that session. */
  skills: number;
}

/** Topics with a session that actually finished. An abandoned call does not count as practised. */
export async function assessedTopics(learnerId: string): Promise<string[]> {
  const sql = db();
  if (!sql) return [];
  const { data } = await sql.rows<{ topic: string }>`
    select distinct topic from course.coach_sessions
     where learner_id = ${learnerId} and ended_at is not null
  `;
  return (data ?? []).map((row) => row.topic);
}

/** Skills already answered on one topic, so a repeat session starts past them. */
export async function coveredSkills(learnerId: string, topic: string): Promise<string[]> {
  const sql = db();
  if (!sql) return [];
  const { data } = await sql.rows<{ skill: string }>`
    select distinct s.skill
      from course.coach_skills s
      join course.coach_sessions c on c.id = s.session_id
     where c.learner_id = ${learnerId} and s.topic = ${topic}
  `;
  return (data ?? []).map((row) => row.skill);
}

export async function recentSessions(learnerId: string, limit = 4): Promise<CoachSessionRecord[]> {
  const sql = db();
  if (!sql) return [];
  const { data } = await sql.rows<CoachSessionRecord>`
    select c.id, c.created_at, c.topic, c.summary, c.first_reply_ms,
           (select count(*) from course.coach_skills s where s.session_id = c.id) as skills
      from course.coach_sessions c
     where c.learner_id = ${learnerId} and c.ended_at is not null
     order by c.created_at desc
     limit ${limit}
  `;
  return data ?? [];
}
