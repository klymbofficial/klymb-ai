import type { Metadata } from "next";
import { auth } from "@/auth";
import { LoadError, OrgPageTitle } from "@/components/company/OrgPanels";
import { PasswordForm } from "@/components/company/PasswordForm";
import { requireCompany } from "@/lib/company/auth";
import { MIN_PASSWORD_LENGTH, needsCurrentPassword } from "@/lib/company/password-rules";
import { passwordSetAt } from "@/lib/company/password-store";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "Settings", robots: { index: false, follow: false } };

const SIGNED_IN_WITH: Record<string, string> = {
  password: "your password",
  "email-code": "an email code",
  google: "Google",
  dev: "dev sign-in",
};

/**
 * Every member's own account: the email they sign in with, and their
 * password. Nobody starts with one; setting it here lets them sign in without
 * waiting for a code. Changing it asks for the current one, unless this
 * session signed in with an email code (the way back in after forgetting it).
 */
export default async function SettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const member = await requireCompany(slug);
  const sql = db();
  const [setAt, session] = await Promise.all([sql ? passwordSetAt(sql, member.email) : undefined, auth()]);
  const method = session?.user?.signInMethod;

  return (
    <>
      <OrgPageTitle title="Settings" intro="Your own account. Your company's admins can't see or change your password." />

      <section aria-labelledby="account-heading" className="card mb-6 max-w-2xl p-6">
        <h2 id="account-heading" className="display text-xl">Account</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-[10rem_1fr]">
          <dt className="font-bold text-ink">Work email</dt>
          <dd className="break-all text-muted">{member.email}</dd>
          {method && SIGNED_IN_WITH[method] && (
            <>
              <dt className="font-bold text-ink">This session</dt>
              <dd className="text-muted">Signed in with {SIGNED_IN_WITH[method]}</dd>
            </>
          )}
        </dl>
      </section>

      <section aria-labelledby="password-heading" className="card max-w-2xl p-6">
        <h2 id="password-heading" className="display text-xl">Password</h2>
        {setAt === undefined ? (
          <div className="mt-4"><LoadError what="Your password settings" /></div>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted">
              {setAt
                ? <>Last changed {setAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}. You can also still sign in with an email code.</>
                : <>You don&apos;t have a password yet, so you sign in with an email code. Set one to sign in without waiting for a code.</>}
            </p>
            <PasswordForm
              slug={member.companySlug}
              email={member.email}
              hasPassword={setAt !== null}
              askCurrent={needsCurrentPassword(setAt !== null, method)}
              minLength={MIN_PASSWORD_LENGTH}
            />
          </>
        )}
      </section>
    </>
  );
}
