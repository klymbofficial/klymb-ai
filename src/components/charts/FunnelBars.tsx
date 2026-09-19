/** Milestone drop-off: each step as a share of the first, so the fall-off is the message. */
export function FunnelBars({ steps }: { steps: { label: string; value: number }[] }) {
  const max = Math.max(1, ...steps.map((s) => s.value));

  return (
    <ul className="flex flex-col gap-4">
      {steps.map((s, i) => {
        const share = max > 0 ? (s.value / max) * 100 : 0;
        const fromPrevious = i > 0 && steps[i - 1].value > 0 ? (s.value / steps[i - 1].value) * 100 : null;
        return (
          <li key={s.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-bold">{s.label}</span>
              <span className="nums text-sm font-extrabold">
                {s.value}
                {fromPrevious !== null && (
                  <span className="ml-2 text-xs font-normal text-muted">{fromPrevious.toFixed(0)}% of previous</span>
                )}
              </span>
            </div>
            <span className="mt-1.5 block h-6 bg-surface">
              <span className="block h-6 bg-ink" style={{ width: `${share}%` }} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
