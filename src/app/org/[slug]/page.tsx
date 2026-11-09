import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyPanel, LoadError, OrgPageTitle, Stat } from "@/components/company/OrgPanels";
import { lastActiveOf, statusOf } from "@/components/company/ProgressTable";
import { requireCompany } from "@/lib/company/auth";
import { loadCompanyPeople } from "@/lib/company/people-data";
import { loadProgress, type MemberProgress } from "@/lib/company/progress-data";
import { contact } from "@/data/config";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "Overview", robots: { index: false, follow: false } };

/**
 * Where every company sign-in lands. HR gets the state of the company and the
 * pages that run it; a head and an employee get their own learning, because
 * that is the only thing their role opens.
 */
export default async function OrgHome({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const member = await requireCompany(slug);
  const sql = db();
  const base = `/org/${member.companySlug}`;

  if (member.role === "hr") {
    const data = sql ? await loadCompanyPeople(sql, member.companyId) : null;
    return (
      <>
        <OrgPageTitle title={member.companyName} intro="Run your company's place on Klymb: who is in, and how they're grouped." />
        {!data ? (
          <LoadError what="Your company's details" />
        ) : (
          <div className="flex flex-col gap-8">
            <div className="grid gap-4 sm:grid-cols-3">
              <Stat label="Seats used" value={<>{data.active.length} <span className="text-lg text-muted">of {data.seatCount}</span></>} note={`${Math.max(0, data.seatCount - data.active.length)} free`} />
              <Stat label="People" value={data.active.length} note="Signed up or invited" />
              <Stat label="Teams" value={data.teams.length} />
            </div>
            {data.active.length <= 1 && (
              <EmptyPanel
                title="You're the only person here so far"
                action={<Link href={`${base}/people`} className="text-sm font-bold underline underline-offset-4 hover:text-red-deep">Add people</Link>}
              >
                Add people one at a time or from a CSV. Each person is emailed how to sign in.
              </EmptyPanel>
            )}
            <section aria-labelledby="where">
              <h2 id="where" className="display text-lg">What you can do</h2>
              <ul className="mt-3 grid gap-4 sm:grid-cols-3">
                <ShortcutCard href={`${base}/people`} title="People" body="Add, resend an invite, or remove. Removing ends access at once." />
                <ShortcutCard href={`${base}/teams`} title="Teams" body="Create teams, choose a head for each, and move people between them." />
                <ShortcutCard href={`${base}/learning`} title="Learning" body="See System Design activity for your people, where there is any." />
              </ul>
            </section>
            <section aria-labelledby="not-yet" className="border-l-4 border-line/40 pl-4">
              <h2 id="not-yet" className="text-sm font-extrabold uppercase tracking-[0.14em] text-muted">Not available yet</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
                <li>Assigning courses or assessments to your people: Klymb sets this up with you for now.</li>
                <li>Company reports and exports.</li>
                <li>Single sign-on: people sign in with an emailed code.</li>
              </ul>
              <p className="mt-3 text-sm text-muted">
                Need one of these? Write to{" "}
                <a href={`mailto:${contact.email}`} className="font-semibold text-ink underline underline-offset-2">{contact.email}</a>.
              </p>
            </section>
          </div>
        )}
      </>
    );
  }

  // Head and employee: their own slice, from the same scoped query as the learning page.
  const progress = sql ? await loadProgress(sql, member) : ({ status: "unavailable" } as const);
  const isHead = member.role === "head";
  return (
    <>
      <OrgPageTitle
        title={isHead ? "Your team" : "Welcome"}
        intro={isHead ? "You see the people on your team. HR manages who is on it." : `You're part of ${member.companyName} on Klymb. HR manages your place; this is your own learning.`}
      />
      {progress.status === "unavailable" ? (
        <LoadError what="Your learning" />
      ) : isHead ? (
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="People on your team" value={progress.rows.length} />
            <Stat label="With System Design access" value={progress.rows.filter((r) => r.hasAccess).length} note="Of your team" />
          </div>
          <Link href={`${base}/learning`} className="text-sm font-bold underline underline-offset-4 hover:text-red-deep">See your team&apos;s learning</Link>
        </div>
      ) : (
        <MyLearning rows={progress.rows} total={progress.totalLessons} slug={member.companySlug} companyName={member.companyName} />
      )}
    </>
  );
}

function ShortcutCard({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <li>
      <Link href={href} className="card block h-full p-5 transition-shadow hover:shadow-float">
        <h3 className="display text-lg">{title}</h3>
        <p className="mt-2 text-sm text-muted">{body}</p>
      </Link>
    </li>
  );
}

/** An employee's own state, and the one honest way into the course when they have it. */
function MyLearning({ rows, total, slug, companyName }: { rows: MemberProgress[]; total: number; slug: string; companyName: string }) {
  const me = rows[0];
  if (!me) return <LoadError what="Your learning" />;
  if (!me.hasAccess) {
    return (
      <EmptyPanel
        title="No course is set up for you yet"
        action={<Link href={`/org/${slug}/learning`} className="text-sm font-bold underline underline-offset-4 hover:text-red-deep">How to reach your course</Link>}
      >
        Being part of {companyName} doesn&apos;t open a course by itself. Klymb doesn&apos;t record one against {me.email} yet.
      </EmptyPanel>
    );
  }
  return (
    <div className="card max-w-xl p-6">
      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">System Design</p>
      <p className="display mt-2 text-2xl">{statusOf(me, total)}</p>
      <p className="mt-1 text-sm text-muted">{me.lessonsPassed} of {total} lessons passed · last activity {lastActiveOf(me)}</p>
      <ButtonLink href="/learn/system-design" arrow className="mt-5">Open the course</ButtonLink>
      <p className="mt-4 text-xs text-muted">The course signs in with Google, not with a company code. Use a Google account for {me.email}, the email your learning is recorded under.</p>
    </div>
  );
}
