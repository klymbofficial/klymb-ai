"use server";

import { revalidatePath } from "next/cache";
import { site } from "@/data/config";
import { getAdmin } from "@/lib/admin/auth";
import { logAdmin } from "@/lib/admin/audit";
import { db } from "@/lib/db/client";
import { MAIL_SUPPORT, sdWhatsAppGroupEmail, sendMail } from "@/lib/mail";
import { pushReady, sendPush, type PushTarget } from "@/lib/push";
import { SD_WHATSAPP_GROUP, paidLearners } from "@/lib/sd-community";
import { SD_WHATSAPP_PUSH } from "@/lib/sd-whatsapp-announce";

export type AnnounceResult =
  | { ok: true; emailed: number; emailFailed: number; pushed: number; pushFailed: number }
  | { ok: false; message: string };

/**
 * Sends the WhatsApp group announcement once: an email to every paid System
 * Design learner and a push to each of their devices. Owners only. The audit
 * log is the record that it went out, so a second press is refused.
 */
export async function sendWhatsAppAnnouncement(): Promise<AnnounceResult> {
  const admin = await getAdmin();
  if (!admin?.owner) return { ok: false, message: "Owners only." };
  const sql = db();
  if (!sql) return { ok: false, message: "Unavailable right now." };

  const { data: prior, error: priorError } = await sql.rows<{ id: string }>`
    select id from course.admin_audit_log where action = 'sd.whatsapp_announce' limit 1
  `;
  if (priorError) return { ok: false, message: "Could not check whether it was already sent." };
  if (prior?.length) return { ok: false, message: "Already sent." };

  const { data: rows, error } = await paidLearners(sql);
  if (error) return { ok: false, message: "Could not read learners." };
  const learners = [...new Map((rows ?? []).map((r) => [r.email, r])).values()];
  // Claim it before sending, so a double click can't send twice.
  await logAdmin(admin, "sd.whatsapp_announce", null, { learners: learners.length });

  let emailed = 0, emailFailed = 0;
  for (const l of learners) {
    const mail = sdWhatsAppGroupEmail({ name: l.name?.trim().split(/\s+/)[0] || "there", groupUrl: SD_WHATSAPP_GROUP, siteUrl: site.url, supportEmail: MAIL_SUPPORT });
    const out = await sendMail({ to: { email: l.email, name: l.name ?? undefined }, ...mail, kind: "sd.whatsapp_group", idempotencyKey: `${l.email}:sd-whatsapp-group` });
    if (out.ok) emailed++;
    else emailFailed++;
  }

  let pushed = 0, pushFailed = 0;
  if (learners.length && pushReady()) {
    const { data: devices } = await sql.rows<PushTarget>`
      select endpoint, p256dh, auth from course.sd_push_subscriptions where email = any(${learners.map((l) => l.email)}::text[])
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
