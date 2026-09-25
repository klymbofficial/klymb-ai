import clsx from "clsx";
import Link from "next/link";

type Variant = "primary" | "secondary" | "inverse";

const styles: Record<Variant, string> = {
  primary: "bg-red-strong text-white border-red-strong hover:bg-red-press hover:border-red-press",
  secondary: "bg-transparent text-ink border-ink hover:bg-ink hover:text-paper",
  inverse: "bg-paper text-red-deep border-paper hover:bg-white",
};

const base =
  "group inline-flex items-center justify-center gap-2 border-2 px-5 py-3 text-sm font-bold transition-[background-color,color,border-color,transform] duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 disabled:active:translate-y-0";

/**
 * The marketing pages use rounded, sentence-case buttons; the interior
 * pages keep the squared, all-caps ones. `soft` picks the former.
 */
const shape = (soft?: boolean) => (soft ? "rounded-lg" : "uppercase tracking-wider");

interface Common {
  variant?: Variant;
  arrow?: boolean;
  soft?: boolean;
  className?: string;
}

function Arrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

export function ButtonLink({
  href, variant = "primary", arrow, soft, className, children,
}: Common & { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={clsx(base, shape(soft), styles[variant], className)}>
      {children}
      {arrow && <Arrow />}
    </Link>
  );
}

export function Button({
  variant = "primary", arrow, soft, className, children, ...props
}: Common & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={clsx(base, shape(soft), styles[variant], className)} {...props}>
      {children}
      {arrow && <Arrow />}
    </button>
  );
}
