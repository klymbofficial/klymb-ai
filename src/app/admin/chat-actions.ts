"use server";

import { revalidatePath } from "next/cache";
import { getAdmin } from "@/lib/admin/auth";
import { logAdmin } from "@/lib/admin/audit";
import { sendMail } from "@/lib/mail";
import { site } from "@/data/config";
import { SUPPORT_EMAIL } from "@/data/support-faq";
import { chatBody, isChatOwner, shouldEmailReply, TEAM_NAME } from "@/lib/live-chat";
import { addMessage, markEmailed, removePushDevice, savePushDevice, setThreadStatus, threadById } from "@/lib/live-chat-db";

type Result = { ok: true; emailed?: boolean } | { ok: false; message: string };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** The one admin allowed into live chat (LIVE_CHAT_EMAIL), or null. */
async function chatAdmin() {
  const admin = await getAdmin();
  return admin && isChatOwner(admin.email) ? admin : null;
}

/** Sends the team's reply into the visitor's chat, and by email if they've left. */
export async function sendTeamReply(threadId: string, raw: string): Promise<Result> {
  const admin = await chatAdmin();
  if (!admin) return { ok: false, message: "Not allowed." };
  const body = chatBody(raw);
  if (!body) return { ok: false, message: "Type a reply first." };
  const thread = await threadById(threadId);
  if (!thread) return { ok: false, message: "That chat no longer exists." };
  const added = await addMessage(thread.id, "team", body, null);
  if (added.error) return { ok: false, message: "Couldn't send. Try again." };
  await logAdmin(admin, "chat.reply", thread.id, { to: thread.email, chars: body.length });

  let emailed = false;
  if (shouldEmailReply(thread)) {
    const link = `${site.url}${thread.page ?? "/"}?chat=open`;
    const mail = await sendMail({
      to: { email: thread.email, ...(thread.name ? { name: thread.name } : {}) },
      replyTo: SUPPORT_EMAIL,
      kind: "chat.reply",
      idempotencyKey: `chat-${added.data!.id}`,
      subject: `${TEAM_NAME} replied to your message`,
      text: `${thread.name ? `Hi ${thread.name},\n\n` : ""}${body}\n\nReply in the chat: ${link}\nOr just reply to this email.\n\n${TEAM_NAME}`,
      html: `${thread.name ? `<p>Hi ${esc(thread.name)},</p>` : ""}<p style="white-space:pre-wrap">${esc(body)}</p><p><a href="${esc(link)}">Continue the chat on Klymb.ai</a>, or just reply to this email.</p><p>${TEAM_NAME}</p>`,
    });
    if (mail.ok) { emailed = true; await markEmailed(thread.id); }
    else console.error("chat reply email failed:", mail.reason);
  }
  revalidatePath(`/admin/chat/${thread.id}`);
  revalidatePath("/admin/chat");
  return { ok: true, emailed };
}

export async function setChatStatus(threadId: string, status: "open" | "done"): Promise<Result> {
  const admin = await chatAdmin();
  if (!admin) return { ok: false, message: "Not allowed." };
  await setThreadStatus(threadId, status);
  await logAdmin(admin, "chat.status", threadId, { status });
  revalidatePath("/admin/chat");
  revalidatePath(`/admin/chat/${threadId}`);
  return { ok: true };
}

/** This phone, for a notification on every visitor message. */
export async function saveChatDevice(sub: { endpoint?: string; keys?: { p256dh?: string; auth?: string } }): Promise<Result> {
  const admin = await chatAdmin();
  if (!admin) return { ok: false, message: "Not allowed." };
  const { endpoint, keys } = sub;
  if (!endpoint?.startsWith("https://") || endpoint.length > 1000 || !keys?.p256dh || !keys.auth || keys.p256dh.length > 200 || keys.auth.length > 100) return { ok: false, message: "This browser didn't give a valid subscription." };
  const { error } = await savePushDevice(admin.email.toLowerCase(), { endpoint, p256dh: keys.p256dh, auth: keys.auth });
  if (error) return { ok: false, message: error.code === "42P01" ? "Run db/migrations/0040_live_chat.sql in Neon first." : "Couldn't save. Try again." };
  return { ok: true };
}

export async function removeChatDevice(endpoint: string): Promise<Result> {
  const admin = await chatAdmin();
  if (!admin) return { ok: false, message: "Not allowed." };
  await removePushDevice(endpoint);
  return { ok: true };
}
