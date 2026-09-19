import clsx from "clsx";

/** Ranked horizontal bars — the clearest form for "which of these is biggest". */
export function BarList({
  rows, unit, emptyLabel = "No data yet.",
}: {
  rows: { label: string; value: number; secondary?: string }[];
  unit: string;
  emptyLabel?: string;
}) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-muted">{emptyLabel}</p>;
  const max = Math.max(1, ...rows.map((r) => r.value));

  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-1.5">
          <span className="truncate text-sm font-bold" title={r.label}>{r.label}</span>
          <span className="nums text-sm font-extrabold">
            {r.value.toLocaleString("en-IN")}
            <span className="ml-1 text-xs font-normal text-muted">{unit}</span>
          </span>
          <span className="col-span-2 h-2 bg-surface">
            <span className={clsx("block h-2 bg-red-strong")} style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}
