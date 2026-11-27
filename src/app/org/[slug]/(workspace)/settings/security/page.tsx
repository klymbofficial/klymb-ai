import type { Metadata } from "next";
import { auth } from "@/auth";
import { LoadError } from "@/components/company/OrgPanels";
import { PasswordForm } from "@/components/company/PasswordForm";
import { LogOutOthers, SettingsCard, SettingsHead } from "@/components/company/SettingsParts";
import { requireCompany } from "@/lib/company/auth";
import { MIN_PASSWORD_LENGTH, needsCurrentPassword } from "@/lib/company/password-rules";
import { passwordSetAt } from "@/lib/company/password-store";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "Security and sign in", robots: { index: false, follow: false } };

const SIGNED_IN_WITH: Record<string, string> = {
  password: "your password",
  "email-code": "an email code",
  google: "Google",
  dev: "dev sign-in",
};

/**
 * How the member signs in: their password (nobody starts with one; setting
 * it lets them sign in without waiting for a code), and signing out every
 * other session. Changing the password asks for the current one, unless this
 * session signed in with an email code (the way back in after forgetting it).
 */
export default async function SecurityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const member = await requireCompany(slug);
  const sql = db();
  const [setAt, session] = await Promise.all([sql ? passwordSetAt(sql, member.email) : undefined, auth()]);
  const method = session?.user?.signInMethod;
  const since = session?.user?.authAt;

  return (
    <>
      <SettingsHead title="Security and sign in" intro="Your company's admins can't see or change your password." />

      <SettingsCard title="Password">
        {setAt === undefined ? <LoadError what="Your password settings" /> : (
          <>
            <p className="text-sm text-muted">
              {setAt
                ? <>Last changed {setAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}. You can also still sign in with an email code.</>
                : <>You don&apos;t have a password yet, so you sign in with an email code. Set one to sign in without waiting for a code.</>}
            </p>
            <PasswordForm slug={member.companySlug} email={member.email} hasPassword={setAt !== null} askCurrent={needsCurrentPassword(setAt !== null, method)} minLength={MIN_PASSWORD_LENGTH} />
          </>
        )}
      </SettingsCard>

      <SettingsCard title="Active sessions">
        <p className="mb-4 text-sm text-muted">Signed in somewhere you no longer use, like a shared or lost computer? Sign out everywhere except here.</p>
        <dl className="mb-5 grid gap-2 text-sm sm:grid-cols-[11rem_1fr]">
          <dt className="font-semibold">This session</dt>
          <dd className="text-muted">
            {method && SIGNED_IN_WITH[method] ? `Signed in with ${SIGNED_IN_WITH[method]}` : "Signed in"}
            {since ? ` on ${new Date(since).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}` : ""}
          </dd>
        </dl>
        <LogOutOthers slug={member.companySlug} />
      </SettingsCard>
    </>
  );
}
