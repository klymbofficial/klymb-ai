import { AdminUsers } from "@/components/admin/AdminUsers";
import { PageTitle } from "@/components/admin/PageTitle";
import { isOwnerEmail } from "@/lib/admin/access";
import { requireOwner } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/admin";

export default async function AdminUsersPage() {
  const me = await requireOwner();
  const supabase = createServiceClient();
  const { data } = supabase
    ? await supabase.from("admin_users").select("email, name, added_at").order("added_at")
    : { data: null };
  const rows = ((data as { email: string; name: string | null; added_at: string }[] | null) ?? []).map((r) => ({
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
