import clsx from "clsx";
import Link from "next/link";

type Variant = "primary" | "secondary" | "inverse";

const styles: Record<Variant, string> = {
  primary: "bg-red-strong text-white border-red-strong hover:bg-red-deep hover:border-red-deep",
  secondary: "bg-transparent text-ink border-ink hover:bg-ink hover:text-paper",
  inverse: "bg-paper text-red-deep border-paper hover:bg-white",
};

const base =
  "inline-flex items-center justify-center gap-2 border-2 px-5 py-3 text-sm font-bold uppercase tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-60";

function Arrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

export function ButtonLink({
  href, variant = "primary", arrow, className, children,
}: { href: string; variant?: Variant; arrow?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={clsx(base, styles[variant], className)}>
      {children}
      {arrow && <Arrow />}
    </Link>
  );
}

export function Button({
  variant = "primary", arrow, className, children, ...props
}: { variant?: Variant; arrow?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={clsx(base, styles[variant], className)} {...props}>
      {children}
      {arrow && <Arrow />}
    </button>
  );
}
