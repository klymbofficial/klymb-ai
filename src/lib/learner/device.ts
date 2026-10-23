import "server-only";
import { db } from "@/lib/db/client";

/**
 * One device per learner. A sign-in claims the learner's single device slot;
 * a second device is refused while the first is still in use. The slot frees
 * itself after DEVICE_IDLE_DAYS without use (a lost phone never locks anyone
 * out for long), on sign-out, or when an admin resets it.
 * Admins are exempt: they review from several machines.
 */
export const DEVICE_IDLE_DAYS = 7;
const SEEN_REFRESH_MS = 10 * 60 * 1000;

const activeSince = () => new Date(Date.now() - DEVICE_IDLE_DAYS * 86_400_000).toISOString();

async function isAdmin(email: string) {
  const sql = db();
  if (!sql) return false;
  const { data } = await sql.row<{ email: string }>`
    select email from course.admin_users where email = ${email}
  `;
  return !!data;
}

/** True when another device holds this learner's slot and has been used recently. */
export async function deviceBusy(email: string) {
  const sql = db();
  if (!sql || (await isAdmin(email))) return false;
  const { data } = await sql.row<{ device_session: string | null; device_seen_at: string | null }>`
    select device_session, device_seen_at from course.learners where email = ${email}
  `;
  return !!(data?.device_session && data.device_seen_at && data.device_seen_at > activeSince());
}

/** Gives this sign-in the learner's slot (called right after a successful sign-in). */
export async function claimDevice(email: string, sid: string) {
  const sql = db();
  if (!sql || (await isAdmin(email))) return;
  await sql.run`
    update course.learners
       set device_session = ${sid}, device_seen_at = ${new Date().toISOString()}
     where email = ${email}
  `;
}

/**
 * Checks a request's session against the learner's slot. An empty slot (a
 * learner enrolled after signing in) is claimed by this session. Returns
 * false when another device owns the slot.
 */
export async function checkDevice(learner: { id: string; email: string; device_session: string | null; device_seen_at: string | null }, sid: string | undefined) {
  if (await isAdmin(learner.email)) return true;
  const sql = db();
  // A session without a device id predates the lock: it must sign in again.
  if (!sid) return false;
  if (!sql) return true; // fail open: never lock anyone out on an outage
  if (!learner.device_session) {
    // Only one device can win an empty slot: the update is conditional, and
    // whoever didn't write it is the second device.
    const { data } = await sql.rows<{ id: string }>`
      update course.learners
         set device_session = ${sid}, device_seen_at = ${new Date().toISOString()}
       where id = ${learner.id} and device_session is null
      returning id
    `;
    return !!data?.length;
  }
  if (learner.device_session !== sid) return false;
  if (!learner.device_seen_at || Date.now() - new Date(learner.device_seen_at).getTime() > SEEN_REFRESH_MS) {
    await sql.run`
      update course.learners set device_seen_at = ${new Date().toISOString()}
       where id = ${learner.id} and device_session = ${sid}
    `;
  }
  return true;
}

/** Frees the slot on sign-out, only if this device holds it. */
export async function releaseDevice(email: string, sid: string | undefined) {
  const sql = db();
  if (!sql || !sid) return;
  await sql.run`
    update course.learners set device_session = null, device_seen_at = null
     where email = ${email} and device_session = ${sid}
  `;
}

/** Admin: free a learner's slot so they can sign in on a new device now. */
export async function resetDevice(learnerId: string) {
  const sql = db();
  if (!sql) return false;
  const { error } = await sql.run`
    update course.learners set device_session = null, device_seen_at = null where id = ${learnerId}
  `;
  return !error;
}
