import { NextResponse } from "next/server";
import { getLearnerState } from "@/lib/learner/data";
import { createServiceClient } from "@/lib/supabase/admin";

const str = (v: unknown, max: number) => (typeof v === "string" && v.length > 0 && v.length <= max ? v : null);

/** The signed-in learner on their one allowed device (a second device can't subscribe). */
async function learnerId() {
  const state = await getLearnerState();
  const supabase = createServiceClient();
  return { supabase, id: state.state === "enrolled" ? state.learner.id : null };
}

/** Saves this device's push subscription for the signed-in learner. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null;
  const endpoint = str(body?.endpoint, 1000);
  const p256dh = str(body?.keys?.p256dh, 200);
  const auth = str(body?.keys?.auth, 100);
  if (!endpoint || !p256dh || !auth || !endpoint.startsWith("https://")) return NextResponse.json({ error: "Invalid subscription." }, { status: 400 });

  const { supabase, id } = await learnerId();
  if (!supabase || !id) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { error } = await supabase.from("push_subscriptions").upsert({ learner_id: id, endpoint, p256dh, auth }, { onConflict: "endpoint" });
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
  const { supabase, id } = await learnerId();
  if (!supabase || !id || !endpoint) return NextResponse.json({ error: "Not found." }, { status: 400 });
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("learner_id", id);
  return NextResponse.json({ ok: true });
}
