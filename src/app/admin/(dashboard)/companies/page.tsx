import { CompaniesAdmin } from "@/components/admin/CompaniesAdmin";
import { PageTitle } from "@/components/admin/PageTitle";
import { requireAdmin } from "@/lib/admin/auth";
import { getCompanies } from "@/lib/admin/companies-data";

export default async function AdminCompaniesPage() {
  await requireAdmin();
  const companies = await getCompanies();

  return (
    <>
      <PageTitle
        eyebrow="B2B"
        title="Companies"
        intro="Companies that buy seats for their people. Set each one's logo, color and seats, and add its first HR person, who then signs in at /org/sign-in with an emailed code. Every change is recorded in Admin activity."
      />
      <CompaniesAdmin companies={companies} />
    </>
  );
}
