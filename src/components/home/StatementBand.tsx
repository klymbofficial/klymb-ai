import { statementSupport } from "@/data/program";

export function StatementBand({ children }: { children: React.ReactNode }) {
  return (
    <section className="bg-gradient-to-b from-red to-red-press text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14">
        <p className="display max-w-4xl text-[clamp(1.5rem,3vw,2.35rem)] leading-tight">{children}</p>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/85">{statementSupport}</p>
      </div>
    </section>
  );
}
