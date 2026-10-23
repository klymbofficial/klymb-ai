import { AdminUsers } from "@/components/admin/AdminUsers";
import { PageTitle } from "@/components/admin/PageTitle";
import { isOwnerEmail } from "@/lib/admin/access";
import { requireOwner } from "@/lib/admin/auth";
import { db } from "@/lib/db/client";

export default async function AdminUsersPage() {
  const me = await requireOwner();
  const sql = db();
  const { data } = sql
    ? await sql.rows<{ email: string; name: string | null; added_at: string }>`
        select email, name, added_at from course.admin_users order by added_at
      `
    : { data: null };
  const rows = (data ?? []).map((r) => ({
    ...r,
    owner: isOwnerEmail(r.email),
    you: r.email === me.email,
  }));

  return (
    <>
      <PageTitle
        eyebrow="Security"
        title="Admins"
        intro="Who can open this admin. Each person signs in with Google using exactly the address listed here. Removing someone takes effect on their next click. Every change is recorded in Admin activity."
      />
      <AdminUsers rows={rows} />
    </>
  );
}
