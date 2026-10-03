import clsx from "clsx";
import type { Kpi } from "@/lib/admin/analytics";
import { formatCompact, formatDuration } from "@/lib/chart";

function value(kpi: Kpi) {
  if (kpi.format === "duration") return formatDuration(kpi.value);
  if (kpi.format === "percent") return `${kpi.value.toFixed(1)}%`;
  return formatCompact(kpi.value);
}

/** Figure, what it means, and how it moved against the previous window. */
export function KpiTile({ kpi }: { kpi: Kpi }) {
  const rising = (kpi.delta ?? 0) > 0;
  // For bounce rate, up is bad: the colour has to follow meaning, not direction.
  const good = kpi.inverse ? !rising : rising;

  return (
    <div className="flex flex-col gap-1 bg-paper p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">{kpi.label}</p>
        {kpi.delta !== null && Number.isFinite(kpi.delta) && (
          <span
            className={clsx(
              "border px-1.5 py-0.5 text-xs font-bold nums",
              good ? "border-green-700 text-green-700" : "border-red-deep text-red-deep",
            )}
          >
            {rising ? "+" : ""}{kpi.delta.toFixed(0)}%
          </span>
        )}
      </div>
      <p className="display nums text-4xl">{value(kpi)}</p>
      <p className="text-xs text-muted">{kpi.hint}</p>
    </div>
  );
}
