"use server";

import { revalidatePath } from "next/cache";
import { site } from "@/data/config";
import { getAdmin } from "@/lib/admin/auth";
import { logAdmin } from "@/lib/admin/audit";
import { db } from "@/lib/db/client";
import { MAIL_SUPPORT, sdAnnouncementEmail, sendMail } from "@/lib/mail";
import { pushReady, sendPush, type PushTarget } from "@/lib/push";
import { audienceLearners, type AnnouncementAudience } from "@/lib/sd-announcements";

export interface AnnouncementInput {
  title: string;
  body: string;
  linkUrl: string;
  linkLabel: string;
  audience: AnnouncementAudience;
  push: boolean;
  email: boolean;
}

export type PostResult = { ok: true; reached: number; pushed: number; emailed: number; failed: number } | { ok: false; message: string };

const httpsUrl = (s: string) => { try { return new URL(s).protocol === "https:"; } catch { return false; } };

/** Checks what was typed. Returns the cleaned announcement, or what's wrong with it. */
function clean(i: AnnouncementInput) {
  const title = i.title.trim(), body = i.body.trim(), linkUrl = i.linkUrl.trim(), linkLabel = i.linkLabel.trim();
  if (!title || title.length > 120) return "The title needs 1 to 120 characters.";
  if (!body || body.length > 1000) return "The message needs 1 to 1000 characters.";
  if (linkUrl && !httpsUrl(linkUrl)) return "The link must be a full https:// address.";
  if (linkUrl && linkLabel.length > 40) return "The button text can be at most 40 characters.";
  if (i.audience !== "all" && i.audience !== "paid") return "Pick who it's for.";
  return { title, body, linkUrl: linkUrl || null, linkLabel: linkUrl ? linkLabel || "Open link" : null, audience: i.audience };
}

/**
 * Posts an announcement to the System Design app's inbox, and, if asked,
 * pushes it to learners' phones and emails it. Owners only.
 */
export async function postAnnouncement(input: AnnouncementInput): Promise<PostResult> {
  const admin = await getAdmin();
  if (!admin?.owner) return { ok: false, message: "Only owners can post announcements." };
  const a = clean(input);
  if (typeof a === "string") return { ok: false, message: a };
  const sql = db();
  if (!sql) return { ok: false, message: "Unavailable right now." };

  const { data: row, error } = await sql.row<{ id: string }>`
    insert into course.sd_announcements (title, body, link_url, link_label, audience, created_by)
    values (${a.title}, ${a.body}, ${a.linkUrl}, ${a.linkLabel}, ${a.audience}, ${admin.email})
    returning id::text
  `;
  if (error || !row) {
    console.error("announcement insert failed:", error?.code, error?.message);
    return { ok: false, message: error?.code === "42P01" ? "Run db/migrations/0033_sd_announcements.sql in Neon first." : "That could not be saved." };
  }
  await logAdmin(admin, "announcement.post", row.id, { title: a.title, audience: a.audience, push: input.push, email: input.email });

  let reached = 0, pushed = 0, emailed = 0, failed = 0;
  if (input.push || input.email) {
    const { data: learners } = await audienceLearners(sql, a.audience);
    reached = learners?.length ?? 0;

    if (input.email) {
      for (const l of learners ?? []) {
        const mail = sdAnnouncementEmail({
          name: l.name?.trim().split(/\s+/)[0] || "there", title: a.title, body: a.body,
          link: a.linkUrl ? { url: a.linkUrl, label: a.linkLabel ?? "Open link" } : null, siteUrl: site.url, supportEmail: MAIL_SUPPORT,
        });
        const out = await sendMail({ to: { email: l.email, name: l.name ?? undefined }, ...mail, kind: "sd.announcement", idempotencyKey: `${l.email}:announcement:${row.id}` });
        if (out.ok) emailed++;
        else if (!out.skipped) failed++;
      }
    }

    if (input.push && learners?.length && pushReady()) {
      const { data: devices } = await sql.rows<PushTarget>`
        select endpoint, p256dh, auth from course.sd_push_subscriptions where email = any(${learners.map((l) => l.email)}::text[])
      `;
      for (const d of devices ?? []) {
        const out = await sendPush(d, { title: a.title, body: a.body.slice(0, 180), url: "/learn/system-design?inbox=1", tag: `sd-announcement-${row.id}` });
        if (out === "ok") pushed++;
        else if (out === "gone") await sql.run`delete from course.sd_push_subscriptions where endpoint = ${d.endpoint}`;
        else failed++;
      }
    }
    await sql.run`update course.sd_announcements set pushed = ${pushed}, emailed = ${emailed} where id = ${row.id}::bigint`;
  }

  revalidatePath("/admin/announcements");
  return { ok: true, reached, pushed, emailed, failed };
}

/** Takes an announcement out of every inbox. The row stays, marked removed. Owners only. */
export async function removeAnnouncement(id: string): Promise<{ ok: boolean; message?: string }> {
  const admin = await getAdmin();
  if (!admin?.owner) return { ok: false, message: "Only owners can remove announcements." };
  if (!/^\d+$/.test(id)) return { ok: false, message: "Unknown announcement." };
  const sql = db();
  if (!sql) return { ok: false, message: "Unavailable right now." };
  const { error } = await sql.run`update course.sd_announcements set removed_at = now() where id = ${id}::bigint and removed_at is null`;
  if (error) return { ok: false, message: "That could not be saved." };
  await logAdmin(admin, "announcement.remove", id);
  revalidatePath("/admin/announcements");
  return { ok: true };
}
