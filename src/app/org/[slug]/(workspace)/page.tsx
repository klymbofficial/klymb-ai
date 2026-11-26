import { redirect } from "next/navigation";
import { requireCompany } from "@/lib/company/auth";
import { homeFor } from "@/lib/company/nav";

/** No Overview any more (user, 26 Nov): the workspace home opens Assessments, or Upskill for those who don't see them. */
export default async function OrgHome({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(homeFor(await requireCompany(slug)));
}
