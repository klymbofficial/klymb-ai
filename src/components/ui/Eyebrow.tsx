import clsx from "clsx";

export function Eyebrow({ children, className, tone = "red" }: { children: React.ReactNode; className?: string; tone?: "red" | "muted" | "light" }) {
  return (
    <p
      className={clsx(
        "text-xs font-extrabold uppercase tracking-[0.14em]",
        tone === "red" && "text-red-deep",
        tone === "muted" && "text-muted",
        tone === "light" && "text-white/85",
        className,
      )}
    >
      {children}
    </p>
  );
}
