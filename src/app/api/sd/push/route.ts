import { NextResponse } from "next/server";
import { currentEmail } from "@/auth";
import { hasCourseAccess } from "@/lib/access";
import { db } from "@/lib/db/client";
import { SD_COURSE } from "@/lib/sd-offer";

const str = (v: unknown, max: number) => (typeof v === "string" && v.length > 0 && v.length <= max ? v : null);

/** Saves this device's notifications for a System Design seat holder. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null;
  const endpoint = str(body?.endpoint, 1000);
  const p256dh = str(body?.keys?.p256dh, 200);
  const auth = str(body?.keys?.auth, 100);
  if (!endpoint || !p256dh || !auth || !endpoint.startsWith("https://")) return NextResponse.json({ error: "Invalid subscription." }, { status: 400 });

  const email = await currentEmail();
  const sql = db();
  if (!sql || !email || !(await hasCourseAccess(email, SD_COURSE))) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  // One row per device: on a shared device it moves to whoever is signed in now.
  const { error } = await sql.run`
    insert into course.sd_push_subscriptions (endpoint, email, p256dh, auth)
    values (${endpoint}, ${email}, ${p256dh}, ${auth})
    on conflict (endpoint) do update set email = excluded.email, p256dh = excluded.p256dh, auth = excluded.auth
  `;
  if (error) {
    console.error("sd push subscribe failed:", error.code, error.message);
    return NextResponse.json({ error: "Could not save reminders." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/** Removes this device. */
export async function DELETE(req: Request) {
  const body = (await req.json().catch(() => null)) as { endpoint?: unknown } | null;
  const endpoint = str(body?.endpoint, 1000);
  const email = await currentEmail();
  const sql = db();
  if (!sql || !email || !endpoint) return NextResponse.json({ error: "Not found." }, { status: 400 });
  await sql.run`delete from course.sd_push_subscriptions where endpoint = ${endpoint} and email = ${email}`;
  return NextResponse.json({ ok: true });
}
