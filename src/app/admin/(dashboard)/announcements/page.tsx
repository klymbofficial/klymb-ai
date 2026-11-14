import { AnnouncementsAdmin, type AnnouncementRow } from "@/components/admin/AnnouncementsAdmin";
import { EmptyState } from "@/components/admin/EmptyState";
import { PageTitle } from "@/components/admin/PageTitle";
import { requireOwner } from "@/lib/admin/auth";
import { db } from "@/lib/db/client";

// Posting with email or push sends one at a time from this page's action.
export const maxDuration = 300;

export default async function AnnouncementsPage() {
  await requireOwner();
  const sql = db();
  const { data, error } = sql
    ? await sql.rows<AnnouncementRow>`
        select id::text, title, body, link_url, link_label, audience, created_by, created_at, removed_at, pushed, emailed
          from course.sd_announcements order by created_at desc limit 50
      `
    : { data: null, error: null };

  return (
    <>
      <PageTitle
        eyebrow="System Design"
        title="Announcements"
        intro="Post a message to the inbox in the System Design app. It shows there for 60 days, with a red badge on the bell until read. Tick push or email to also reach learners outside the app. Owners only; every post and removal is in Admin activity."
      />
      {error?.code === "42P01" ? (
        <EmptyState title="Announcements aren't set up yet" body="Run db/migrations/0033_sd_announcements.sql in the Neon SQL editor once, then reload this page." />
      ) : (
        <AnnouncementsAdmin rows={data ?? []} />
      )}
    </>
  );
}
