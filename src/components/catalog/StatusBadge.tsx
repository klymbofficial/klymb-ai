import clsx from "clsx";
import type { ProgramStatus } from "@/data/catalog";

/** The state of a program in words, never in colour alone. */
export function StatusBadge({ status, className }: { status: ProgramStatus; className?: string }) {
  const open = status === "available";
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider",
        open ? "bg-ink text-paper" : "border border-dashed border-line bg-transparent text-muted",
        className,
      )}
    >
      <span aria-hidden="true" className={clsx("size-1.5 rounded-full", open ? "bg-red-soft" : "bg-line")} />
      {open ? "Open for enrolment" : "Not available"}
    </span>
  );
}
