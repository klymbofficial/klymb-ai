"use server";

import { revalidatePath } from "next/cache";
import { getAdmin } from "@/lib/admin/auth";
import { logAdmin } from "@/lib/admin/audit";
import { db } from "@/lib/db/client";
import { pushReady, sendPush, type PushTarget } from "@/lib/push";
import { learnersAwaitingGroupEmail, sendGroupEmailOnce } from "@/lib/sd-community";
import { SD_WHATSAPP_PUSH } from "@/lib/sd-whatsapp-announce";

export type AnnounceResult =
  | { ok: true; emailed: number; emailFailed: number; pushed: number; pushFailed: number }
  | { ok: false; message: string };

/**
 * Sends the WhatsApp group announcement to every active System Design seat
 * that has not had it yet, and a push to each of their devices. Owners only.
 * Each seat remembers when it was emailed (whatsapp_mailed_at), so pressing
 * again only reaches people who enrolled since, and nobody gets it twice.
 */
export async function sendWhatsAppAnnouncement(): Promise<AnnounceResult> {
  const admin = await getAdmin();
  if (!admin?.owner) return { ok: false, message: "Owners only." };
  const sql = db();
  if (!sql) return { ok: false, message: "Unavailable right now." };

  const { data: rows, error } = await learnersAwaitingGroupEmail(sql);
  if (error) return { ok: false, message: "Could not read learners." };
  const learners = [...new Map((rows ?? []).map((r) => [r.email, r])).values()];
  if (!learners.length) return { ok: false, message: "Everyone enrolled has already had it." };
  await logAdmin(admin, "sd.whatsapp_announce", null, { learners: learners.length });

  // A seat is claimed before its email goes, so a double click sends nothing twice.
  let emailed = 0, emailFailed = 0;
  const reached: string[] = [];
  for (const l of learners) {
    const out = await sendGroupEmailOnce(sql, l.email, l.name);
    if (out === "sent") { emailed++; reached.push(l.email); }
    else if (out === "failed") emailFailed++;
  }

  let pushed = 0, pushFailed = 0;
  if (reached.length && pushReady()) {
    const { data: devices } = await sql.rows<PushTarget>`
      select endpoint, p256dh, auth from course.sd_push_subscriptions where email = any(${reached}::text[])
    `;
    for (const d of devices ?? []) {
      const out = await sendPush(d, { ...SD_WHATSAPP_PUSH, url: "/learn/system-design" });
      if (out === "ok") pushed++;
      else if (out === "gone") await sql.run`delete from course.sd_push_subscriptions where endpoint = ${d.endpoint}`;
      else pushFailed++;
    }
  }

  await logAdmin(admin, "sd.whatsapp_announce", "result", { emailed, emailFailed, pushed, pushFailed });
  revalidatePath("/admin/system-design");
  return { ok: true, emailed, emailFailed, pushed, pushFailed };
}
