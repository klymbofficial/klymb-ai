import { contact } from "@/data/config";
import type { ResolvedBrand } from "@/lib/company/branding";

/**
 * Who to ask for help: the company's own support contact when it has published
 * one, and Klymb's always, for problems with Klymb itself.
 */
export function BrandSupport({ brand, className }: { brand: ResolvedBrand; className?: string }) {
  const own = brand.supportEmail || brand.supportText;
  return (
    <section aria-label="Help" className={className}>
      <p className="text-xs text-muted">
        {own ? (
          <>
            Help from {brand.name}:{" "}
            {brand.supportText && <span className="text-ink">{brand.supportText}</span>}
            {brand.supportText && brand.supportEmail && " · "}
            {brand.supportEmail && (
              <a href={`mailto:${brand.supportEmail}`} className="font-semibold text-ink underline underline-offset-2">{brand.supportEmail}</a>
            )}
            . Trouble with Klymb itself?{" "}
          </>
        ) : (
          <>Need help? </>
        )}
        <a href={`mailto:${contact.email}`} className="font-semibold text-ink underline underline-offset-2">{contact.email}</a>
      </p>
    </section>
  );
}
