/**
 * Registration stands alone: no announcement bar, header or footer. The page
 * is the panel and the form, filling the screen.
 */
export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="min-h-dvh bg-card">
      {children}
    </main>
  );
}
