import Link from "next/link";

export function Wordmark({ className = "text-2xl" }: { className?: string }) {
  return (
    <Link href="/" aria-label="Klymb.ai home" className={`display inline-flex items-baseline ${className}`}>
      KLYMB<span className="text-red">.AI</span>
    </Link>
  );
}
