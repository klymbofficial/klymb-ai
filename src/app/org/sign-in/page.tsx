import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CompanySignInForm } from "@/components/company/CompanySignInForm";
import { Wordmark } from "@/components/layout/Wordmark";
import { getMemberships } from "@/lib/company/auth";
import { safeOrgNext } from "@/lib/company/return-path";

export const metadata: Metadata = { title: "Company sign-in", robots: { index: false, follow: false } };

/**
 * The sign-in page for every company. Invited members ask for a code by
 * email; nothing here names a company, so it can't be used to find out
 * which companies or people are on Klymb.
 *
 * ?next= is the workspace page someone was sent here from. It is kept through
 * both steps and followed after sign-in, only when safeOrgNext allows it.
 */
export default async function CompanySignInPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const next = safeOrgNext((await searchParams).next);
  // Already signed in as a member: straight on, to the page asked for, their
  // one workspace, or the list of their workspaces.
  const memberships = await getMemberships();
  if (memberships.length) redirect(next ?? (memberships.length === 1 ? `/org/${memberships[0].companySlug}` : "/org"));

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
          <CompanySignInForm next={next} />
        </div>
        <ul className="mt-6 space-y-2 text-xs text-muted">
          <li>Admins manage people and teams. Track course progress in Upskill.</li>
          <li>
            Not invited by a company? <Link href="/learn" className="font-semibold text-ink underline underline-offset-2">Sign in to your course</Link> instead.
          </li>
        </ul>
      </div>
    </div>
  );
}
