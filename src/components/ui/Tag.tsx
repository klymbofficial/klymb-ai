import clsx from "clsx";

export function Tag({ children, tone = "outline", className }: { children: React.ReactNode; tone?: "outline" | "red" | "ink"; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center border-2 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider",
        tone === "outline" && "border-ink/70 text-ink",
        tone === "red" && "border-red-deep bg-red-tint text-red-deep",
        tone === "ink" && "border-ink bg-ink text-paper",
        className,
      )}
    >
      {children}
    </span>
  );
}
