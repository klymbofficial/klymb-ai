import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { Wordmark } from "@/components/layout/Wordmark";
import { getAdmin } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin sign-in", robots: { index: false, follow: false } };

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  if (await getAdmin()) redirect("/admin");

  // Signed in, but not on the allowlist: say so plainly instead of looping.
  const supabase = await createClient();
  const signedInAs = supabase ? (await supabase.auth.getUser()).data.user?.email ?? null : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Wordmark className="text-2xl" />
          <p className="mt-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted">Admin access</p>
        </div>
        <div className="border-2 border-line bg-paper p-6 sm:p-8">
          {signedInAs ? (
            <div className="flex flex-col gap-4">
              <h1 className="display text-2xl">Not an admin account</h1>
              <p className="text-sm text-muted">
                You are signed in as <strong className="text-ink">{signedInAs}</strong>, which is not on the admin list.
                Ask an existing admin to add this email, or sign out and use a different account.
              </p>
              <LoginForm signedInAs={signedInAs} />
            </div>
          ) : (
            <>
              <h1 className="display text-2xl">Sign in</h1>
              <p className="mt-2 text-sm text-muted">Access is limited to approved Klymb.ai email addresses.</p>
              <LoginForm error={error === "sign-in-failed" ? "Google sign-in did not complete. Please try again." : undefined} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
