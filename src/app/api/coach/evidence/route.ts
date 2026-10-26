import { NextResponse } from "next/server";
import { parseSessionSummary, parseSkillEvidence } from "@/lib/coach/assessment";
import { db } from "@/lib/db/client";
import { getLearnerState } from "@/lib/learner/data";
import { checkRateLimit } from "@/lib/rate-limit";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * What the coach recorded while it was talking.
 *
 * `skill` writes one row of evidence; `summary` closes the session. The
 * browser relays these from the model's function calls and does not wait for
 * the reply before answering the model, which is the whole point: the next
 * question is asked while this is being written.
 *
 * Because the browser is in the middle, nothing here is trusted. The topic is
 * read from the session row rather than the body, the session must belong to
 * the caller, and the result is evidence for a reviewer — it grants nothing.
 */
export async function POST(req: Request) {
  const state = await getLearnerState();
  if (state.state !== "enrolled") {
    return NextResponse.json({ error: "Sign in on your cohort account." }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const id = typeof body?.session === "string" ? body.session : "";
  if (!body || !UUID.test(id)) return NextResponse.json({ error: "Which session this belongs to is missing." }, { status: 400 });

  // A session is a handful of these; the ceiling is for a loop, not for use.
  const limit = await checkRateLimit("coach-evidence", { limit: 150, windowMinutes: 60, identity: state.learner.email });
  if (!limit.allowed) return NextResponse.json({ error: "Too many at once." }, { status: 429 });

  const sql = db();
  if (!sql) return NextResponse.json({ error: "Could not save that." }, { status: 503 });

  // Both the ownership check and the topic come from here, so the browser has
  // no say in either.
  const { data: session } = await sql.row<{ topic: string }>`
    select topic from course.coach_sessions where id = ${id} and learner_id = ${state.learner.id}
  `;
  if (!session) return NextResponse.json({ error: "That is not your session." }, { status: 404 });

  if (body.kind === "summary") {
    const parsed = parseSessionSummary(body);
    if (!parsed.ok) return NextResponse.json({ error: parsed.reason }, { status: 400 });

    // `ended_at is null` makes a repeated call harmless: the first close wins.
    const { error } = await sql.run`
      update course.coach_sessions
         set summary = ${parsed.value.summary},
             first_reply_ms = ${parsed.value.firstReplyMs},
             ended_at = now()
       where id = ${id} and learner_id = ${state.learner.id} and ended_at is null
    `;
    if (error) return NextResponse.json({ error: "Could not save that." }, { status: 503 });
    return NextResponse.json({ ok: true });
  }

  const parsed = parseSkillEvidence({ ...body, topic: session.topic }, [session.topic]);
  if (!parsed.ok) return NextResponse.json({ error: parsed.reason }, { status: 400 });
  const { topic, skill, level, evidence, nextStep } = parsed.value;

  const { error } = await sql.run`
    insert into course.coach_skills (session_id, topic, skill, level, evidence, next_step)
    values (${id}, ${topic}, ${skill}, ${level}, ${evidence}, ${nextStep})
  `;
  if (error) return NextResponse.json({ error: "Could not save that." }, { status: 503 });
  return NextResponse.json({ ok: true });
}
