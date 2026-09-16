import { EmptyState } from "@/components/admin/EmptyState";
import { PageTitle } from "@/components/admin/PageTitle";
import { ProgressTable } from "@/components/admin/ProgressTable";
import { getLearnerProgress } from "@/lib/admin/data";

export default async function AdminLearnersPage() {
  const learners = await getLearnerProgress();

  return (
    <>
      <PageTitle
        eyebrow="Cohort"
        title="Learners & progress"
        intro="Days submitted out of 30, weekly assessment scores, and the GitHub and LinkedIn evidence each learner has provided."
      />
      {learners.length === 0 ? (
        <EmptyState
          title="No learners enrolled yet"
          body="This fills in once learners have accounts and start submitting daily deliverables. The database tables, access rules and this view are already built and waiting — enrolment is the next piece to add."
        />
      ) : (
        <ProgressTable rows={learners} />
      )}
    </>
  );
}
