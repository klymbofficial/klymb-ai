import { NavProgress } from "@/components/company/NavFeedback";
import { BrandMark } from "@/components/company/BrandMark";

export interface CandidateBrand {
  name: string;
  logoUrl: string | null;
  accent: string | null;
}

/** The candidate's pages: the company's band on top, one narrow column. */
export function CandidateShell({ brand, wide = false, back, children }: {
  brand: CandidateBrand | null;
  wide?: boolean;
  /** A way back for someone signed in to the company (an employee's internal test): never shown inside the timed test. */
  back?: { href: string; label: string } | null;
  children: React.ReactNode;
}) {
  const width = wide ? "max-w-4xl" : "max-w-2xl";
  return (
    <div className="min-h-screen bg-paper">
      <NavProgress />
      <header className={brand?.accent ? "text-white" : "bg-night text-paper"} style={brand?.accent ? { background: brand.accent } : undefined}>
        <div className={`mx-auto flex ${width} items-center justify-between gap-4 px-4 py-4 sm:px-6`}>
          {brand ? <BrandMark name={brand.name} logoUrl={brand.logoUrl} /> : <span className="text-sm font-bold">Klymb.ai</span>}
          {back && (
            <a href={back.href} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-md border-2 border-current/40 px-3 text-sm font-bold hover:border-current">
              <span aria-hidden="true">←</span> {back.label}
            </a>
          )}
        </div>
      </header>
      <main className={`mx-auto flex ${width} flex-col gap-6 px-4 py-10 sm:px-6`}>{children}</main>
    </div>
  );
}

/** A plain message in place of the test: why the link doesn't work, or what happens next. */
export function CandidateNotice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section role="status" className="card p-6">
      <h1 className="display text-2xl">{title}</h1>
      <div className="mt-3 text-sm leading-relaxed">{children}</div>
    </section>
  );
}
