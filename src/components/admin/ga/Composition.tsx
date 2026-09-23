const SHADES = ["var(--color-red-strong)", "var(--color-ink)", "#9b958f", "#d6d1cb", "#ece8e4"];

/** One stacked bar for a small part-to-whole (devices, new vs returning), with a legend. */
export function Composition({ rows, unit }: { rows: { label: string; value: number }[]; unit: string }) {
  const total = rows.reduce((s, r) => s + r.value, 0);
  if (!total) return <p className="py-6 text-center text-sm text-muted">No data in this window.</p>;
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full" role="img" aria-label={rows.map((r) => `${r.label} ${((r.value / total) * 100).toFixed(0)}%`).join(", ")}>
        {rows.map((r, i) => <span key={r.label} style={{ width: `${(r.value / total) * 100}%`, background: SHADES[i % SHADES.length] }} />)}
      </div>
      <ul className="mt-4 grid gap-2 text-sm">
        {rows.map((r, i) => (
          <li key={r.label} className="flex items-center gap-3">
            <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: SHADES[i % SHADES.length] }} />
            <span className="flex-1 font-semibold">{r.label}</span>
            <span className="nums font-bold">{r.value.toLocaleString("en-IN")}</span>
            <span className="nums w-12 text-right text-xs text-muted">{((r.value / total) * 100).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">{total.toLocaleString("en-IN")} {unit}</p>
    </div>
  );
}
