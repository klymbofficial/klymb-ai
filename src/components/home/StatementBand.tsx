export function StatementBand({ children }: { children: React.ReactNode }) {
  return (
    <section className="bg-red-strong text-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="display max-w-[22ch] text-[clamp(2rem,5vw,3.75rem)] leading-[1.02]">{children}</p>
      </div>
    </section>
  );
}
