import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyPanel, LoadError, OrgPageTitle, Stat } from "@/components/company/OrgPanels";
import { lastActiveOf, statusOf } from "@/components/company/ProgressTable";
import { hasRole, isAdmin, viewOf } from "@/lib/company/access";
import { requireCompany } from "@/lib/company/auth";
import { getPublishedBrand } from "@/lib/company/branding-data";
import { loadCompanyPeople } from "@/lib/company/people-data";
import { loadProgress, type MemberProgress } from "@/lib/company/progress-data";
import { contact } from "@/data/config";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "Overview", robots: { index: false, follow: false } };

/**
 * Where every company sign-in lands. An admin gets the state of the company
 * and the pages that run it. Everyone else gets the widest learning view they
 * have: the company (company head), their team (team lead) or themselves.
 * Recruiters and reviewers are told where their hiring work will appear.
 */
export default async function OrgHome({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const member = await requireCompany(slug);
  const brand = await getPublishedBrand(member);
  const welcome = brand.welcome && <WelcomeNote text={brand.welcome} name={brand.name} />;
  const sql = db();
  const base = `/org/${member.companySlug}`;

  if (isAdmin(member)) {
    const data = sql ? await loadCompanyPeople(sql, member.companyId) : null;
    return (
      <>
        {welcome}
        <OrgPageTitle title={brand.name} intro="Run your company's place on Klymb: who is in, and how they're grouped." />
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
                <ShortcutCard href={`${base}/learning`} title="Learning" body="Assign System Design to your people, and see how they are getting on." />
              </ul>
            </section>
            <section aria-labelledby="not-yet" className="border-l-4 border-line/40 pl-4">
              <h2 id="not-yet" className="text-sm font-extrabold uppercase tracking-[0.14em] text-muted">Not available yet</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
                <li>Assigning anything other than System Design, and assigning assessments.</li>
                <li>Hiring batches for recruiters and reviewers.</li>
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

  // Everyone else: their own slice, from the same scoped query as the learning page.
  const progress = sql ? await loadProgress(sql, member) : ({ status: "unavailable" } as const);
  const view = viewOf(member);
  const hiring = hasRole(member, ["recruiter", "reviewer"]);
  return (
    <>
      {welcome}
      <OrgPageTitle
        title={view === "company" ? brand.name : view === "team" ? "Your team" : "Welcome"}
        intro={
          view === "company"
            ? "You see learning across the whole company. Your company's admin manages people and teams."
            : view === "team"
              ? "You see the people on the team you lead. Your company's admin manages who is on it."
              : `You're part of ${member.companyName} on Klymb. Your company's admin manages your place; this is your own learning.`
        }
      />
      <div className="flex flex-col gap-8">
        {progress.status === "unavailable" ? (
          <LoadError what="Learning" />
        ) : view === "self" ? (
          <MyLearning rows={progress.rows} total={progress.totalLessons} slug={member.companySlug} companyName={member.companyName} />
        ) : (
          <div className="flex flex-col gap-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Stat label={view === "company" ? "People in the company" : "People on your team"} value={progress.rows.length} />
              <Stat label="With the course assigned" value={progress.rows.filter((r) => r.assigned).length} note={view === "company" ? "Of the company" : "Of your team"} />
            </div>
            <Link href={`${base}/learning`} className="text-sm font-bold underline underline-offset-4 hover:text-red-deep">
              {view === "company" ? "See the company's learning" : "See your team's learning"}
            </Link>
          </div>
        )}
        {hiring && (
          <EmptyPanel title="No hiring batches yet">
            You&apos;re a {member.roles.filter((r) => r === "recruiter" || r === "reviewer").join(" and ")} for {member.companyName}. Hiring
            batches you&apos;re given access to will appear here once your company starts using them.
          </EmptyPanel>
        )}
      </div>
    </>
  );
}

/** The company's own welcome, as they published it. */
function WelcomeNote({ text, name }: { text: string; name: string }) {
  return (
    <section aria-label={`A welcome from ${name}`} className="mb-8 border-l-4 border-red-strong bg-card px-5 py-4">
      <p className="text-base text-ink">{text}</p>
    </section>
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
        title="No course is assigned to you yet"
        action={<Link href={`/org/${slug}/learning`} className="text-sm font-bold underline underline-offset-4 hover:text-red-deep">How to reach your course</Link>}
      >
        Being part of {companyName} doesn&apos;t open a course by itself. Your company&apos;s admin assigns System Design to people; it isn&apos;t assigned to {me.email} yet.
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
