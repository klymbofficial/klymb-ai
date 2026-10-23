import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { getLearnerState } from "@/lib/learner/data";

const str = (v: unknown, max: number) => (typeof v === "string" && v.length > 0 && v.length <= max ? v : null);

/** The signed-in learner on their one allowed device (a second device can't subscribe). */
async function learnerId() {
  const state = await getLearnerState();
  return { sql: db(), id: state.state === "enrolled" ? state.learner.id : null };
}

/** Saves this device's push subscription for the signed-in learner. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null;
  const endpoint = str(body?.endpoint, 1000);
  const p256dh = str(body?.keys?.p256dh, 200);
  const auth = str(body?.keys?.auth, 100);
  if (!endpoint || !p256dh || !auth || !endpoint.startsWith("https://")) return NextResponse.json({ error: "Invalid subscription." }, { status: 400 });

  const { sql, id } = await learnerId();
  if (!sql || !id) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  // One row per device: re-subscribing on the same endpoint moves it to
  // whoever is signed in now, rather than stacking up duplicates.
  const { error } = await sql.run`
    insert into course.push_subscriptions (learner_id, endpoint, p256dh, auth)
    values (${id}, ${endpoint}, ${p256dh}, ${auth})
    on conflict (endpoint) do update
       set learner_id = excluded.learner_id, p256dh = excluded.p256dh, auth = excluded.auth
  `;
  if (error) {
    console.error("push subscribe failed:", error.code, error.message);
    return NextResponse.json({ error: "Could not save reminders." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/** Removes this device's subscription. */
export async function DELETE(req: Request) {
  const body = (await req.json().catch(() => null)) as { endpoint?: unknown } | null;
  const endpoint = str(body?.endpoint, 1000);
  const { sql, id } = await learnerId();
  if (!sql || !id || !endpoint) return NextResponse.json({ error: "Not found." }, { status: 400 });
  await sql.run`delete from course.push_subscriptions where endpoint = ${endpoint} and learner_id = ${id}`;
  return NextResponse.json({ ok: true });
}
