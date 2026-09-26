import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import { Sparkline } from "@/components/charts/Sparkline";
import type { Kpi } from "@/lib/admin/analytics";
import { formatCompact, formatDuration } from "@/lib/chart";

function display(kpi: Pick<Kpi, "value" | "format">) {
  if (kpi.format === "duration") return formatDuration(kpi.value);
  if (kpi.format === "percent") return `${kpi.value.toFixed(1)}%`;
  return formatCompact(kpi.value);
}

/** Figure, what it means, how it moved, and the shape of the window. */
export function GaKpiTile({
  kpi, icon: Icon, spark, sub,
}: { kpi: Kpi; icon?: LucideIcon; spark?: number[]; sub?: string }) {
  const rising = (kpi.delta ?? 0) > 0;
  // For bounce rate, up is bad: the colour follows meaning, not direction.
  const good = kpi.inverse ? !rising : rising;
  const showDelta = kpi.delta !== null && Number.isFinite(kpi.delta);

  return (
    <div className="card flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">{kpi.label}</p>
        {Icon && (
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface text-ink/70" aria-hidden="true">
            <Icon size={16} strokeWidth={2} />
          </span>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="display nums text-[2rem] leading-none">{display(kpi)}</p>
        {showDelta && (
          <span className={clsx("nums rounded-md px-1.5 py-0.5 text-[11px] font-bold", good ? "bg-green-50 text-green-700" : "bg-red-tint text-red-deep")}>
            {rising ? "▲" : "▼"} {Math.abs(kpi.delta!).toFixed(0)}%
          </span>
        )}
      </div>
      <p className="mt-2 text-xs text-muted">{sub ?? kpi.hint}</p>
      {spark && spark.length > 1 && <Sparkline values={spark} className="mt-3" />}
    </div>
  );
}
