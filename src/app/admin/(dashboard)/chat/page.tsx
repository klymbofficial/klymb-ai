import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/admin/EmptyState";
import { AutoRefresh, ChatPushToggle, LiveRefresh } from "@/components/admin/LiveChatAdmin";
import { PageTitle } from "@/components/admin/PageTitle";
import { requireAdmin } from "@/lib/admin/auth";
import { isChatOwner } from "@/lib/live-chat";
import { latestMessageId, listThreads, notMigrated } from "@/lib/live-chat-db";

export const metadata: Metadata = { title: "Live chat", manifest: "/admin-chat.webmanifest" };
export const dynamic = "force-dynamic";

const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  if (m < 24 * 60) return `${Math.round(m / 60)}h`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
};

/** Live chat from the Kamran bot. Only the live-chat owner can open it; to everyone else it doesn't exist. */
export default async function LiveChatPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const admin = await requireAdmin();
  if (!isChatOwner(admin.email)) notFound();
  const show = (await searchParams).show === "done" ? "done" : "open";
  const [{ data: threads, error }, latest] = await Promise.all([listThreads(show), latestMessageId()]);
  const tab = (key: "open" | "done", label: string) => (
    <Link href={key === "open" ? "/admin/chat" : "/admin/chat?show=done"} aria-current={show === key ? "page" : undefined} className={`-mb-px border-b-2 px-3 py-2 text-sm font-bold ${show === key ? "border-red-strong" : "border-transparent text-muted"}`}>{label}</Link>
  );

  return (
    <>
      <PageTitle eyebrow="Support" title="Live chat" intro="People who tapped “Talk to our team” in the chatbot. They see your replies as “Klymb team”." />
      {!error && <LiveRefresh after={latest} />}
      <AutoRefresh ms={30_000} />
      <ChatPushToggle />
      <nav aria-label="Chats" className="mb-4 flex gap-1 border-b border-line/25">{tab("open", "Open")}{tab("done", "Done")}</nav>
      {error ? (
        <EmptyState title={notMigrated(error) ? "Live chat isn't set up yet" : "Couldn't load chats"} body={notMigrated(error) ? "Run db/migrations/0040_live_chat.sql in the Neon SQL editor once. Chats start arriving right after." : "Try again in a moment."} />
      ) : threads.length === 0 ? (
        <EmptyState title={show === "open" ? "No open chats" : "Nothing marked done yet"} body="When someone starts a chat from the bot, it shows up here and on your phone." />
      ) : (
        <ul className="card divide-y divide-line/25 overflow-hidden">
          {threads.map((t) => {
            const unread = !!t.last_visitor_at && (!t.admin_seen_at || t.admin_seen_at < t.last_visitor_at);
            const at = [t.last_visitor_at, t.last_admin_at, t.created_at].filter(Boolean).sort().at(-1)!;
            return (
              <li key={t.id}>
                <Link href={`/admin/chat/${t.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-surface/60">
                  <span aria-hidden className={`mt-1.5 size-2.5 shrink-0 rounded-full ${unread ? "bg-red-strong" : "bg-transparent"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={`truncate ${unread ? "font-extrabold" : "font-semibold"}`}>{t.name || t.email}</span>
                      <span className="shrink-0 text-xs text-muted nums">{ago(at)}</span>
                    </span>
                    <span className="block truncate text-xs text-muted">{t.email}{t.page ? ` · ${t.page}` : ""}</span>
                    <span className={`mt-0.5 block truncate text-sm ${unread ? "text-ink" : "text-muted"}`}>{t.last_sender === "team" ? "You: " : ""}{t.last_body}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
