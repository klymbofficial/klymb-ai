import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutOfCompany } from "@/app/org/actions";
import { Wordmark } from "@/components/layout/Wordmark";
import { ROLE_LABEL } from "@/lib/company/access";
import { getMemberships } from "@/lib/company/auth";

export const metadata: Metadata = { title: "Your workspaces", robots: { index: false, follow: false } };

/**
 * /org on its own. Not a member anywhere: the sign-in page. One workspace:
 * straight there. Several: a list to choose from, each with what the person
 * does there. The list comes from the database for the signed-in email only.
 */
export default async function OrgIndex() {
  const memberships = await getMemberships();
  if (memberships.length === 0) redirect("/org/sign-in");
  if (memberships.length === 1) redirect(`/org/${memberships[0].companySlug}`);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Wordmark className="text-2xl" />
          <p className="mt-2 text-xs font-extrabold uppercase tracking-[0.18em] text-muted">Your workspaces</p>
        </div>
        <div className="card p-6 sm:p-8">
          <h1 className="display text-2xl">Choose a workspace</h1>
          <p className="mt-2 text-sm text-muted">{memberships[0].email} belongs to {memberships.length} companies on Klymb.</p>
          <ul className="mt-6 flex flex-col gap-3">
            {memberships.map((m) => (
              <li key={m.companyId}>
                <Link
                  href={`/org/${m.companySlug}`}
                  className="block border border-line/40 bg-white px-4 py-3 transition-colors hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  <span className="block text-sm font-bold text-ink">{m.companyName}</span>
                  <span className="block text-xs text-muted">{m.roles.map((r) => ROLE_LABEL[r]).join(" · ")}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <form action={signOutOfCompany} className="mt-6 text-center text-xs">
          <button type="submit" className="font-semibold text-muted underline underline-offset-2 hover:text-ink">Sign out</button>
        </form>
      </div>
    </div>
  );
}
