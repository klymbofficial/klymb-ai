import { redirect } from "next/navigation";
import { getMember } from "@/lib/company/auth";

/** /org on its own: a signed-in member goes to their company, anyone else to the sign-in page. */
export default async function OrgIndex() {
  const member = await getMember();
  redirect(member ? `/org/${member.companySlug}` : "/org/sign-in");
}
