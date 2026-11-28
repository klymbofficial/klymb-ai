import { EmptyState } from "@/components/admin/EmptyState";
import { PageTitle } from "@/components/admin/PageTitle";
import { RegistrationsTable } from "@/components/admin/RegistrationsTable";
import { getLearnerProgress, getRegistrations, getSdRegistrations } from "@/lib/admin/data";

export default async function AdminRegistrationsPage() {
  const [tracks, sd, learners] = await Promise.all([getRegistrations(), getSdRegistrations(), getLearnerProgress()]);
  // One list, newest first: 30-day tracks and System Design side by side.
  const registrations = [...tracks, ...sd].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  const enrolled = learners.map((l) => l.email.toLowerCase());

  return (
    <>
      <PageTitle
        eyebrow="Pipeline"
        title="Registrations"
        intro="Everyone who has registered interest. Search, filter by track (System Design included), and export what you need."
      />
      {registrations.length === 0 ? (
        <EmptyState title="Nothing here yet" body="Registrations from the public form land here instantly, newest first." />
      ) : (
        <RegistrationsTable rows={registrations} enrolled={enrolled} />
      )}
    </>
  );
}
