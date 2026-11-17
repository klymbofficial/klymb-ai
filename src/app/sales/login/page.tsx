import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signInToSales, signOutOfSales } from "@/app/sales/actions";
import { Wordmark } from "@/components/layout/Wordmark";
import { GoogleMark } from "@/components/ui/GoogleMark";
import { currentAdminEmail } from "@/auth";
import { getSalesUser } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Sales sign-in", robots: { index: false, follow: false } };

/** Where interns sign in. Access is given by an owner in Sales › Team, by Google email. */
export default async function SalesLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const user = await getSalesUser();
  if (user) redirect(user.role === "owner" ? "/admin/sales" : "/sales");
  // Signed in with Google, but not on the team: say so instead of looping.
  const signedInAs = await currentAdminEmail();

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Wordmark className="text-2xl" />
          <p className="mt-2 text-xs font-extrabold uppercase tracking-[0.18em] text-muted">Sales team</p>
        </div>
        <div className="card p-6 sm:p-8">
          {signedInAs ? (
            <div className="flex flex-col gap-4">
              <h1 className="display text-2xl">Not on the sales team</h1>
              <p className="text-sm text-muted">
                You are signed in as <strong className="text-ink">{signedInAs}</strong>, which hasn&apos;t been added to the sales team.
                Ask Sarthak to add this Gmail, or sign out and use the one you gave him.
              </p>
              <form action={signOutOfSales}>
                <button type="submit" className="w-full rounded-full border border-line/50 px-4 py-3 text-sm font-bold hover:bg-surface">Sign out</button>
              </form>
            </div>
          ) : (
            <>
              <h1 className="display text-2xl">Sign in</h1>
              <p className="mt-2 text-sm text-muted">Use the Google account you gave Klymb.ai. You&apos;ll see the leads assigned to you.</p>
              <form action={signInToSales} className="mt-6">
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-3 rounded-full border border-line/50 bg-white px-4 py-3 text-sm font-bold text-ink shadow-card transition-colors hover:bg-surface"
                >
                  <GoogleMark />
                  Continue with Google
                </button>
              </form>
              {error && <p role="alert" className="mt-4 border-2 border-error bg-error-tint p-3 text-sm font-semibold text-error">Google sign-in did not complete. Please try again.</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
