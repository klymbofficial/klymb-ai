import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CompanySignInForm } from "@/components/company/CompanySignInForm";
import { Wordmark } from "@/components/layout/Wordmark";
import { getMember } from "@/lib/company/auth";

export const metadata: Metadata = { title: "Company sign-in", robots: { index: false, follow: false } };

/**
 * The sign-in page for every company. Invited members ask for a code by
 * email; nothing here names a company, so it can't be used to find out
 * which companies or people are on Klymb.
 */
export default async function CompanySignInPage() {
  // Already signed in as a member: straight to their company.
  const member = await getMember();
  if (member) redirect(`/org/${member.companySlug}`);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Wordmark className="text-2xl" />
          <p className="mt-2 text-xs font-extrabold uppercase tracking-[0.18em] text-muted">Company sign-in</p>
        </div>
        <div className="card p-6 sm:p-8">
          <h1 className="display text-2xl">Sign in</h1>
          <p className="mt-2 text-sm text-muted">
            For people invited by their company. Enter your work email and we&apos;ll send you a code.
          </p>
          <CompanySignInForm />
        </div>
      </div>
    </div>
  );
}
