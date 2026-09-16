import { EmptyState } from "@/components/admin/EmptyState";
import { PageTitle } from "@/components/admin/PageTitle";
import { RegistrationsTable } from "@/components/admin/RegistrationsTable";
import { getRegistrations } from "@/lib/admin/data";

export default async function AdminRegistrationsPage() {
  const registrations = await getRegistrations();

  return (
    <>
      <PageTitle
        eyebrow="Pipeline"
        title="Registrations"
        intro="Everyone who has registered interest. Search, filter by track, and export what you need."
      />
      {registrations.length === 0 ? (
        <EmptyState title="Nothing here yet" body="Registrations from the public form land here instantly, newest first." />
      ) : (
        <RegistrationsTable rows={registrations} />
      )}
    </>
  );
}
