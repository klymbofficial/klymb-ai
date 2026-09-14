export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs font-extrabold uppercase tracking-[0.14em] text-muted">
        <span>{label}</span><span>{value}/{max}</span>
      </div>
      <div role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} className="mt-2 h-3 bg-surface">
        <div className="h-3 bg-red-strong" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
