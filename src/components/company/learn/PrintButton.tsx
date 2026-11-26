"use client";

/** Opens the browser's print dialog, where "Save as PDF" downloads the certificate. */
export function PrintButton({ className, children }: { className?: string; children: React.ReactNode }) {
  return <button type="button" onClick={() => window.print()} className={className}>{children}</button>;
}
