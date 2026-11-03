import "./offer.css";

/** The offer's night sky: warm glows. */
export function OfferBackdrop({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-x-clip bg-[#1a1716] [font-family:var(--font-archivo)] text-[#f6efe4] [container-type:inline-size]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(60% 50% at 12% 0%,rgba(201,162,74,.22),transparent 70%),radial-gradient(50% 60% at 100% 30%,rgba(131,5,11,.55),transparent 70%),radial-gradient(40% 40% at 30% 100%,rgba(240,134,139,.12),transparent 70%)" }}
      />
      {children}
    </div>
  );
}
