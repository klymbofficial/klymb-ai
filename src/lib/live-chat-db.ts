import "server-only";
import { db } from "@/lib/db/client";
import { pushReady, sendPush } from "@/lib/push";
import { chatEmails, chatOwnerEmail, hashChatToken, newChatToken } from "@/lib/live-chat";

export interface ChatThread {
  id: string;
  email: string;
  name: string | null;
  anon_id: string | null;
  page: string | null;
  context: Record<string, string>;
  status: "open" | "done";
  created_at: string;
  last_visitor_at: string | null;
  last_admin_at: string | null;
  visitor_seen_at: string | null;
  admin_seen_at: string | null;
  emailed_at: string | null;
}

export interface ChatMessage { id: number; sender: "visitor" | "team"; body: string; page: string | null; created_at: string }

/** `42P01`: the tables aren't there, so the migration hasn't run. */
export const notMigrated = (e: { code?: string } | null | undefined) => e?.code === "42P01";

export async function startThread(t: { email: string; name: string | null; anon: string | null; page: string | null; context: Record<string, string>; body: string }) {
  const sql = db();
  if (!sql) return { error: { message: "no database" } as { message: string; code?: string } };
  const token = newChatToken();
  const { data, error } = await sql.row<{ id: string }>`
    insert into course.chat_threads (token_hash, email, name, anon_id, page, context, last_visitor_at, visitor_seen_at)
    values (${hashChatToken(token)}, ${t.email}, ${t.name}, ${t.anon}, ${t.page}, ${JSON.stringify(t.context)}::jsonb, now(), now())
    returning id
  `;
  if (error || !data) return { error: error ?? { message: "not saved" } };
  const msg = await addMessage(data.id, "visitor", t.body, t.page);
  if (msg.error) return { error: msg.error };
  return { id: data.id, token };
}

export async function threadByToken(token: string) {
  const sql = db();
  if (!sql) return null;
  const { data } = await sql.row<ChatThread>`select * from course.chat_threads where token_hash = ${hashChatToken(token)}`;
  return data;
}

/**
 * A visitor who chatted signed out and then signed in: the chat moves to their
 * account's email, so the team sees that account's payments, course and trail.
 * The email they typed first is kept in the context as `typedEmail`.
 */
export async function linkAccount(t: ChatThread, account: string): Promise<ChatThread> {
  if (account === t.email) return t;
  const sql = db();
  if (!sql) return t;
  const { data } = await sql.row<ChatThread>`
    update course.chat_threads
       set email = ${account},
           context = context || jsonb_build_object('typedEmail', coalesce(context->>'typedEmail', email), 'signedInAt', now()::text)
     where id = ${t.id}
     returning *
  `;
  return data ?? t;
}

export async function threadById(id: string) {
  const sql = db();
  if (!sql || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data } = await sql.row<ChatThread>`select * from course.chat_threads where id = ${id}`;
  return data;
}

/** Adds a message and moves the chat's clock; a visitor writing again reopens a finished chat. */
export async function addMessage(threadId: string, sender: "visitor" | "team", body: string, page: string | null) {
  const sql = db();
  if (!sql) return { error: { message: "no database" } };
  const { data, error } = await sql.row<ChatMessage>`
    insert into course.chat_messages (thread_id, sender, body, page) values (${threadId}, ${sender}, ${body}, ${page})
    returning id, sender, body, page, created_at
  `;
  if (error) return { error };
  if (sender === "visitor") {
    await sql.run`update course.chat_threads set last_visitor_at = now(), visitor_seen_at = now(), status = 'open', page = coalesce(${page}, page) where id = ${threadId}`;
  } else {
    await sql.run`update course.chat_threads set last_admin_at = now(), admin_seen_at = now() where id = ${threadId}`;
  }
  return { data };
}

export async function messagesOf(threadId: string, afterId = 0) {
  const sql = db();
  if (!sql) return [];
  const { data } = await sql.rows<ChatMessage>`
    select id, sender, body, page, created_at from course.chat_messages
     where thread_id = ${threadId} and id > ${afterId} order by id limit 500
  `;
  return data ?? [];
}

export async function markSeen(threadId: string, who: "visitor" | "team") {
  const sql = db();
  if (!sql) return;
  if (who === "visitor") await sql.run`update course.chat_threads set visitor_seen_at = now() where id = ${threadId}`;
  else await sql.run`update course.chat_threads set admin_seen_at = now() where id = ${threadId}`;
}

export async function markEmailed(threadId: string) {
  const sql = db();
  if (sql) await sql.run`update course.chat_threads set emailed_at = now() where id = ${threadId}`;
}

export async function setThreadStatus(threadId: string, status: "open" | "done") {
  const sql = db();
  if (sql) await sql.run`update course.chat_threads set status = ${status} where id = ${threadId}`;
}

export interface ThreadRow extends ChatThread { last_body: string | null; last_sender: "visitor" | "team" | null; messages: number }

/** The chat list, newest activity first. */
export async function listThreads(show: "open" | "done") {
  const sql = db();
  if (!sql) return { data: [] as ThreadRow[], error: { message: "no database" } as { message: string; code?: string } };
  const { data, error } = await sql.rows<ThreadRow>`
    select t.*, m.body as last_body, m.sender as last_sender,
           (select count(*)::int from course.chat_messages c where c.thread_id = t.id) as messages
      from course.chat_threads t
      left join lateral (select body, sender from course.chat_messages where thread_id = t.id order by id desc limit 1) m on true
     where t.status = ${show}
     order by greatest(coalesce(t.last_visitor_at, t.created_at), coalesce(t.last_admin_at, t.created_at)) desc
     limit 200
  `;
  return { data: data ?? [], error };
}

/** How many chats have a visitor message the team hasn't opened yet. */
export async function unreadCount() {
  const sql = db();
  if (!sql) return 0;
  const { data } = await sql.scalar<number>`
    select count(*)::int from course.chat_threads
     where status = 'open' and last_visitor_at is not null and (admin_seen_at is null or admin_seen_at < last_visitor_at)
  `;
  return data ?? 0;
}

/** A notification on every device the live-chat owner turned on. Dead devices are removed. */
export async function notifyTeam(thread: { id: string; name: string | null; email: string }, body: string) {
  const sql = db();
  if (!sql || !pushReady()) return;
  const { data } = await sql.rows<{ endpoint: string; p256dh: string; auth: string }>`
    select endpoint, p256dh, auth from course.chat_push_subscriptions where email = ${chatOwnerEmail()}
  `;
  for (const d of data ?? []) {
    const r = await sendPush(d, {
      title: `💬 ${thread.name || thread.email}`,
      body: body.length > 140 ? `${body.slice(0, 139)}…` : body,
      url: `/admin/chat/${thread.id}`,
      tag: `chat-${thread.id}`,
      loud: true,
      action: "Reply",
    }, { fast: true });
    if (r === "gone") await sql.run`delete from course.chat_push_subscriptions where endpoint = ${d.endpoint}`;
  }
}

export async function savePushDevice(email: string, sub: { endpoint: string; p256dh: string; auth: string }) {
  const sql = db();
  if (!sql) return { error: { message: "no database" } as { message: string; code?: string } };
  return sql.run`
    insert into course.chat_push_subscriptions (endpoint, email, p256dh, auth) values (${sub.endpoint}, ${email}, ${sub.p256dh}, ${sub.auth})
    on conflict (endpoint) do update set email = excluded.email, p256dh = excluded.p256dh, auth = excluded.auth
  `;
}

export async function removePushDevice(endpoint: string) {
  const sql = db();
  if (sql) await sql.run`delete from course.chat_push_subscriptions where endpoint = ${endpoint}`;
}

/** Everything we know about the person in a chat, for the panel beside it. */
export async function visitorActivity(t: ChatThread) {
  const sql = db();
  const empty = { events: [], payments: [], prereg: null, enrolled: false, checks: [], lead: null, tickets: [], chats: [] };
  if (!sql) return empty;
  const since = new Date(Date.now() - 120 * 864e5).toISOString();
  // The signed-in account and the email typed before signing in, so nothing they did is missed.
  const emails = chatEmails(t);
  const [events, payments, prereg, enrolled, checks, lead, tickets, chats] = await Promise.all([
    sql.rows<{ event: string; lesson: string | null; step: string | null; props: Record<string, unknown> | null; created_at: string; anon_id: string; path: string | null }>`
      select event, lesson, step, props, created_at, anon_id, path from course.sd_events
       where created_at > ${since} and (anon_id = ${t.anon_id ?? ""} or email = any(${emails}::text[]))
       order by created_at limit 1000
    `,
    sql.rows<{ status: string; amount: number; currency: string; coupon_code: string | null; created_at: string; track: string }>`
      select status, amount, currency, coupon_code, created_at, track from course.payments where email = any(${emails}::text[]) order by created_at desc limit 20
    `,
    sql.row<{ name: string; phone: string; status: string; linkedin: string | null; locked_price: number; created_at: string }>`
      select name, phone, status, linkedin, locked_price, created_at from course.sd_preregistrations where email = any(${emails}::text[]) order by updated_at desc limit 1
    `,
    sql.scalar<boolean>`select exists (select 1 from course.enrollments where email = any(${emails}::text[]) and status = 'active')`,
    sql.rows<{ lesson: string; best_score: number; passed_at: string | null }>`
      select lesson, best_score, passed_at from course.lesson_checks where email = any(${emails}::text[]) order by lesson
    `,
    sql.row<{ id: string; stage: string; source: string }>`
      select id, stage, source from course.sales_leads where email = any(${emails}::text[]) order by created_at desc limit 1
    `,
    sql.rows<{ message: string; created_at: string; status: string }>`
      select message, created_at, status from course.support_tickets where email = any(${emails}::text[]) order by created_at desc limit 5
    `,
    sql.rows<{ id: string; created_at: string }>`
      select id, created_at from course.chat_threads where email = any(${emails}::text[]) and id <> ${t.id} order by created_at desc limit 5
    `,
  ]);
  return {
    events: events.data ?? [],
    payments: payments.data ?? [],
    prereg: prereg.data,
    enrolled: !!enrolled.data,
    checks: checks.data ?? [],
    lead: lead.data,
    tickets: tickets.data ?? [],
    chats: chats.data ?? [],
  };
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Long polling: holds the request until a message after `afterId` exists (in
 * one chat, or any chat when `threadId` is null), checking every 700 ms, for
 * at most `ms`. So a new message reaches the other side in about a second,
 * with no extra service.
 */
export async function waitForMessages(threadId: string | null, afterId: number, ms: number, signal?: AbortSignal) {
  const sql = db();
  if (!sql) return [];
  const end = Date.now() + ms;
  for (;;) {
    const fresh = threadId ? await messagesOf(threadId, afterId) : await newestAfter(afterId);
    if (fresh.length || Date.now() >= end || signal?.aborted) return fresh;
    await pause(700);
  }
}

/** The newest message id, in one chat or across all of them. */
export async function latestMessageId(threadId: string | null = null) {
  const sql = db();
  if (!sql) return 0;
  const { data } = threadId
    ? await sql.scalar<number>`select coalesce(max(id), 0)::int from course.chat_messages where thread_id = ${threadId}`
    : await sql.scalar<number>`select coalesce(max(id), 0)::int from course.chat_messages`;
  return data ?? 0;
}

async function newestAfter(afterId: number) {
  const sql = db();
  if (!sql) return [];
  const { data } = await sql.rows<ChatMessage>`
    select id, sender, body, page, created_at from course.chat_messages where id > ${afterId} order by id limit 50
  `;
  return data ?? [];
}
