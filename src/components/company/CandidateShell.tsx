import { BrandMark } from "@/components/company/BrandMark";

export interface CandidateBrand {
  name: string;
  logoUrl: string | null;
  accent: string | null;
}

/** The candidate's pages: the company's band on top, one narrow column. */
export function CandidateShell({ brand, wide = false, children }: { brand: CandidateBrand | null; wide?: boolean; children: React.ReactNode }) {
  const width = wide ? "max-w-4xl" : "max-w-2xl";
  return (
    <div className="min-h-screen bg-paper">
      <header className={brand?.accent ? "text-white" : "bg-night text-paper"} style={brand?.accent ? { background: brand.accent } : undefined}>
        <div className={`mx-auto flex ${width} items-center px-4 py-4 sm:px-6`}>
          {brand ? <BrandMark name={brand.name} logoUrl={brand.logoUrl} /> : <span className="text-sm font-bold">Klymb.ai</span>}
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
