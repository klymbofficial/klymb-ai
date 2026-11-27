import type { ReactNode } from "react";

/** Server-renderable charts with values alongside every mark. */
export const CHART_COLOR = {
  blue: "#2563eb", green: "#15803d", amber: "#b45309", slate: "#64748b",
  light: "#cbd5e1", violet: "#7c3aed", red: "#b91c1c",
} as const;
export interface ChartValue { label: string; value: number; color: string }
export const chartPercent = (value: number, total: number) =>
  total > 0 && Number.isFinite(total) && Number.isFinite(value) ? Math.min(100, Math.max(0, value / total * 100)) : 0;

export function ChartPanel({ title, note, children, action }: { title: string; note?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section aria-label={title} className="min-w-0 rounded-lg border border-line/30 bg-white p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-2">
        <div><h2 className="text-base font-bold">{title}</h2>{note && <p className="mt-1 text-sm text-muted">{note}</p>}</div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ProgressRing({ value, total, label, color = CHART_COLOR.blue }: { value: number; total: number; label: string; color?: string }) {
  const percent = chartPercent(value, total);
  return (
    <div role="img" aria-label={`${label}: ${value} of ${total}${total > 0 ? ` (${Math.round(percent)}%)` : ""}`} className="relative size-40 shrink-0">
      <svg viewBox="0 0 160 160" aria-hidden="true" className="size-full -rotate-90">
        <circle cx="80" cy="80" r="65" fill="none" stroke="#e2e8f0" strokeWidth="12" />
        <circle cx="80" cy="80" r="65" fill="none" stroke={color} strokeWidth="12" pathLength="100" strokeDasharray={`${percent} ${100 - percent}`} />
      </svg>
      <div aria-hidden="true" className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <span className="text-3xl font-bold tabular-nums">{total > 0 ? `${Math.round(percent)}%` : "—"}</span>
        <span className="max-w-28 text-center text-sm text-muted">{label}</span>
      </div>
    </div>
  );
}

export function ProgressMeter({ value, total, label, color = CHART_COLOR.blue }: { value: number; total: number; label: string; color?: string }) {
  return (
    <div role="img" aria-label={`${label}: ${value} of ${total}`} className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
      <div className="h-full rounded-full" style={{ width: `${chartPercent(value, total)}%`, backgroundColor: color }} />
    </div>
  );
}

export function StackedBar({ items, label }: { items: ChartValue[]; label: string }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  return (
    <div role="img" aria-label={`${label}: ${items.map((item) => `${item.label} ${item.value}`).join(", ")}`} className="flex h-5 w-full overflow-hidden rounded bg-slate-100">
      {items.filter((item) => item.value > 0).map((item) => (
        <div key={item.label} title={`${item.label}: ${item.value}`} style={{ width: `${chartPercent(item.value, total)}%`, backgroundColor: item.color }} />
      ))}
    </div>
  );
}

export function ChartLegend({ items }: { items: ChartValue[] }) {
  return (
    <ul className="mt-5 grid gap-x-5 gap-y-3 text-sm sm:grid-cols-2">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <span aria-hidden="true" className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: item.color }} />
          <span className="min-w-0 flex-1">{item.label}</span><strong className="tabular-nums">{item.value}</strong>
        </li>
      ))}
    </ul>
  );
}

/** A shared count scale, never a fabricated time series or conversion funnel. */
export function BarChart({ items, label, total }: { items: ChartValue[]; label: string; total?: number }) {
  const max = total ?? Math.max(0, ...items.map((item) => item.value));
  return (
    <div aria-label={label} className="space-y-4">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-4 text-sm"><span className="min-w-0 break-words">{item.label}</span><strong className="tabular-nums">{item.value}</strong></div>
          <div aria-hidden="true" className="h-3 overflow-hidden rounded-sm bg-slate-100"><div className="h-full rounded-sm" style={{ width: `${chartPercent(item.value, max)}%`, backgroundColor: item.color }} /></div>
        </div>
      ))}
      {max === 0 && <p className="text-sm text-muted">No activity recorded yet.</p>}
    </div>
  );
}
