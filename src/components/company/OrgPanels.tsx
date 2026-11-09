import clsx from "clsx";
import Link from "next/link";

/** The page title block. Sentence case, one line of intro. */
export function OrgPageTitle({ title, intro }: { title: string; intro?: string }) {
  return (
    <div className="mb-8 border-b border-line/25 pb-5">
      <h1 className="display text-3xl">{title}</h1>
      {intro && <p className="mt-3 max-w-2xl text-sm text-muted">{intro}</p>}
    </div>
  );
}

/** The data could not be read: a fault, not an empty list. */
export function LoadError({ what }: { what: string }) {
  return (
    <p role="alert" className="border-2 border-error bg-error-tint p-4 text-sm font-semibold text-error">
      {what} can&apos;t be loaded right now. Reload the page in a minute. If it keeps happening, write to the Klymb team.
    </p>
  );
}

/** Signed in, but this page is for another role. Nothing from the page is loaded. */
export function RoleOnly({ role, home }: { role: string; home: string }) {
  return (
    <div role="status" className="card p-6">
      <h2 className="display text-xl">This page is for {role}</h2>
      <p className="mt-2 max-w-xl text-sm text-muted">
        You&apos;re signed in, but your role here doesn&apos;t include this page. Ask your company&apos;s HR contact if you think it should.
      </p>
      <Link href={home} className="mt-4 inline-block text-sm font-bold underline underline-offset-4 hover:text-red-deep">
        Back to overview
      </Link>
    </div>
  );
}

/** Nothing here yet, said plainly, with the next step when there is one. */
export function EmptyPanel({ title, children, action }: { title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="border-2 border-dashed border-line/40 p-6">
      <h2 className="display text-lg">{title}</h2>
      {children && <div className="mt-2 max-w-xl text-sm text-muted">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, note, tone }: { label: string; value: React.ReactNode; note?: string; tone?: "warn" }) {
  return (
    <div className={clsx("card p-5", tone === "warn" && "border-l-4 border-l-red")}>
      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="display mt-2 text-3xl">{value}</p>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </div>
  );
}
