/**
 * Rows with a count and a proportional share bar — the "countries in detail"
 * shape, reused for any breakdown where the share matters more than the rank.
 */
export function ShareTable({
  rows, columns, shareOf,
}: {
  rows: { label: string; values: number[] }[];
  /** Column headings after the label. */
  columns: string[];
  /** Which value column the share bar is computed from. */
  shareOf: number;
}) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-muted">No data in this window.</p>;
  const total = rows.reduce((s, r) => s + r.values[shareOf], 0) || 1;
  const max = Math.max(...rows.map((r) => r.values[shareOf])) || 1;

  return (
    <div className="overflow-x-auto rounded-xl border border-line/25">
      <table className="w-full min-w-[30rem] text-sm">
        <thead className="bg-surface/60 text-left text-xs font-bold text-muted">
          <tr>
            <th scope="col" className="px-4 py-3">{columns[0]}</th>
            {columns.slice(1).map((c) => <th key={c} scope="col" className="px-4 py-3 text-right">{c}</th>)}
            <th scope="col" className="px-4 py-3">Share</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/20">
          {rows.map((r) => {
            const share = r.values[shareOf] / total;
            return (
              <tr key={r.label}>
                <th scope="row" className="max-w-[16rem] truncate px-4 py-3 text-left font-semibold" title={r.label}>{r.label}</th>
                {r.values.map((v, i) => <td key={i} className="nums px-4 py-3 text-right">{v.toLocaleString("en-IN")}</td>)}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-32 overflow-hidden rounded-full bg-surface">
                      <span className="block h-full rounded-full bg-red-strong" style={{ width: `${(r.values[shareOf] / max) * 100}%` }} />
                    </span>
                    <span className="nums w-12 text-right text-xs text-muted">{(share * 100).toFixed(1)}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
