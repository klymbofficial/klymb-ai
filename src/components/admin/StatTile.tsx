import clsx from "clsx";

export function StatTile({
  label, value, hint, tone = "ink",
}: { label: string; value: string | number; hint?: string; tone?: "ink" | "red" | "muted" }) {
  return (
    <div className="flex flex-col gap-1 bg-paper p-5">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className={clsx("display nums text-4xl", tone === "red" && "text-red", tone === "muted" && "text-muted")}>{value}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
