import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoRefresh, LiveRefresh, ReplyBox, ScrollToEnd } from "@/components/admin/LiveChatAdmin";
import { requireAdmin } from "@/lib/admin/auth";
import { trailLines, type Tone } from "@/lib/admin/sd-event-words";
import { lessonDay } from "@/lib/course-app";
import { formatINR } from "@/lib/format";
import { isChatOwner } from "@/lib/live-chat";
import { markSeen, messagesOf, threadById, visitorActivity } from "@/lib/live-chat-db";
import { formatPhone } from "@/lib/sales";

export const metadata: Metadata = { title: "Live chat", manifest: "/admin-chat.webmanifest" };
export const dynamic = "force-dynamic";

const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" });
const dayName = (lesson: string | null) => (lesson && /^\d+-\d+$/.test(lesson) ? lessonDay(lesson) : "");
/** Their chat window checked in within the last minute. */
const onSiteNow = (seen: string | null) => !!seen && Date.now() - new Date(seen).getTime() < 60_000;
/** The offer page's steps, in the words the System Design admin page uses. */
const OFFER_WORDS: Record<string, string> = {
  view: "Opened the offer page", form_start: "Started the offer form", claim: "Tapped Claim", blocked: "Was told to leave the in-app browser", open_browser: "Tapped Open in browser",
  google: "Went to Google sign-in", order_failed: "Order failed", rzp_open: "Opened Razorpay", rzp_closed: "Closed Razorpay", rzp_failed: "Payment failed", paid: "Paid",
};
const TONE: Record<Tone, string> = { learn: "bg-sky-500", win: "bg-emerald-500", miss: "bg-red-500", nav: "bg-line", setting: "bg-amber-500" };

/** One chat: the conversation, the reply box, and what this person has done on the site. */
export default async function ChatThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!isChatOwner(admin.email)) notFound();
  const thread = await threadById((await params).id);
  if (!thread) notFound();
  const [msgs, act] = await Promise.all([messagesOf(thread.id), visitorActivity(thread)]);
  await markSeen(thread.id, "team");
  const offer = act.events.filter((e) => e.event === "offer");
  const trail = [
    ...trailLines(act.events.filter((e) => e.event !== "offer")),
    ...offer.map((e) => ({ at: e.created_at, lesson: null, text: OFFER_WORDS[e.step ?? ""] ?? `Offer page: ${e.step ?? "visit"}`, tone: (e.step === "paid" ? "win" : /failed/.test(e.step ?? "") ? "miss" : "nav") as Tone, detail: e.props?.inApp ? "in Instagram's browser" : undefined })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 60);
  const anon = thread.anon_id ?? act.events.find((e) => e.anon_id)?.anon_id;
  const online = onSiteNow(thread.visitor_seen_at);

  return (
    <>
      <LiveRefresh after={msgs.at(-1)?.id ?? 0} thread={thread.id} />
      {/* Slower, for "has the chat open now" and their activity. */}
      <AutoRefresh ms={30_000} />
      <Link href="/admin/chat" className="mb-3 inline-block text-xs font-bold text-muted underline underline-offset-4">← All chats</Link>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <section className="card flex min-h-[60vh] flex-col overflow-hidden" aria-label="Conversation">
          <header className="border-b border-line/25 px-4 py-3">
            <p className="font-extrabold">{thread.name || thread.email}</p>
            <p className="text-xs text-muted">
              {thread.email} · {online ? <span className="font-bold text-emerald-700">has the chat open now</span> : thread.visitor_seen_at ? `last seen ${when(thread.visitor_seen_at)}` : "not seen"}
              {thread.status === "done" && " · marked done"}
            </p>
          </header>
          <ol className="flex-1 space-y-3 overflow-y-auto bg-surface/50 px-4 py-4">
            {msgs.map((m) => (
              <li key={m.id} className={m.sender === "team" ? "flex flex-col items-end" : "flex flex-col items-start"}>
                <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${m.sender === "team" ? "rounded-br-sm bg-ink text-white" : "rounded-bl-sm bg-card ring-1 ring-line/30"}`}>{m.body}</div>
                <span className="mt-0.5 text-[11px] text-muted">{m.sender === "team" ? "Klymb team" : "Them"} · {time(m.created_at)}{m.sender === "visitor" && m.page ? ` · ${m.page}` : ""}</span>
              </li>
            ))}
            <li><ScrollToEnd count={msgs.length} /></li>
          </ol>
          <ReplyBox threadId={thread.id} status={thread.status} />
        </section>

        <aside className="flex flex-col gap-4" aria-label="What they've done">
          <div className="card p-4 text-sm">
            <h2 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-muted">Who</h2>
            <dl className="grid grid-cols-[90px_1fr] gap-x-2 gap-y-1">
              <dt className="text-muted">Started on</dt><dd>{thread.page ?? "—"}</dd>
              <dt className="text-muted">Course</dt><dd>{act.enrolled ? <span className="font-bold text-emerald-700">Has a System Design seat</span> : "No seat"}</dd>
              {act.prereg && <><dt className="text-muted">Offer form</dt><dd>{act.prereg.name} · {formatPhone(act.prereg.phone)} · {act.prereg.status}</dd></>}
              {act.prereg?.linkedin && <><dt className="text-muted">LinkedIn</dt><dd><a href={act.prereg.linkedin} target="_blank" rel="noreferrer" className="underline">Profile</a></dd></>}
              {act.lead && <><dt className="text-muted">Sales</dt><dd><Link href={`/admin/sales/leads/${act.lead.id}`} className="underline">{act.lead.stage}</Link> · {act.lead.source}</dd></>}
              {thread.context.device && <><dt className="text-muted">Device</dt><dd>{thread.context.device}</dd></>}
              {thread.context.lastQuestion && <><dt className="text-muted">Asked Kamran</dt><dd>{thread.context.lastQuestion}</dd></>}
            </dl>
          </div>

          {act.payments.length > 0 && (
            <div className="card p-4 text-sm">
              <h2 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-muted">Payments</h2>
              <ul className="space-y-1">
                {act.payments.map((p, i) => (
                  <li key={i}>{when(p.created_at)} · {p.currency === "INR" ? formatINR(p.amount / 100) : `${p.amount / 100} ${p.currency}`} · <span className={p.status === "paid" ? "font-bold text-emerald-700" : "text-muted"}>{p.status}</span>{p.coupon_code ? ` · ${p.coupon_code}` : ""}</li>
                ))}
              </ul>
            </div>
          )}

          {act.checks.length > 0 && (
            <div className="card p-4 text-sm">
              <h2 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-muted">Lesson checks</h2>
              <p>{act.checks.filter((c) => c.passed_at).length} passed: {act.checks.filter((c) => c.passed_at).map((c) => dayName(c.lesson) || c.lesson).join(", ") || "none yet"}</p>
            </div>
          )}

          <div className="card p-4 text-sm">
            <h2 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-muted">What they did, newest first</h2>
            {trail.length === 0 ? (
              <p className="text-muted">Nothing recorded on the System Design pages yet.</p>
            ) : (
              <ol className="space-y-1.5">
                {trail.map((l, i) => (
                  <li key={i} className="flex gap-2">
                    <span aria-hidden className={`mt-1.5 size-2 shrink-0 rounded-full ${TONE[l.tone]}`} />
                    <span><span className="text-muted">{when(l.at)}</span>{dayName(l.lesson) ? ` · ${dayName(l.lesson)}` : ""} · <span className={l.tone === "nav" ? "text-muted" : "font-semibold"}>{l.text}</span>{l.detail && <span className="text-muted"> · {l.detail}</span>}</span>
                  </li>
                ))}
              </ol>
            )}
            {anon && <Link href={`/admin/system-design?learner=${anon}`} className="mt-3 inline-block text-xs font-bold underline">Full trail →</Link>}
          </div>

          {(act.tickets.length > 0 || act.chats.length > 0) && (
            <div className="card p-4 text-sm">
              <h2 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-muted">Before this</h2>
              <ul className="space-y-1">
                {act.chats.map((c) => <li key={c.id}><Link href={`/admin/chat/${c.id}`} className="underline">Chat on {when(c.created_at)}</Link></li>)}
                {act.tickets.map((t, i) => <li key={i}>Ticket {when(t.created_at)} ({t.status}): <span className="text-muted">{t.message.slice(0, 80)}</span></li>)}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
