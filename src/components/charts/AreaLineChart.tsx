import { formatDayLabel } from "@/lib/chart";

export interface SeriesDef<T> {
  label: string;
  color: string;
  fill?: string;
  /** Reads this series' value out of a point: typed, so no key lookups. */
  get: (point: T) => number;
}

/**
 * Two-series line chart with an area under the first.
 * Drawn as SVG against one scale, so every label names a value the chart reaches.
 */
export function AreaLineChart<T extends { date: string }>({
  points, series, height = 220, caption,
}: {
  points: readonly T[];
  series: SeriesDef<T>[];
  height?: number;
  caption: string;
}) {
  if (points.length < 2) {
    return <p className="py-10 text-center text-sm text-muted">Not enough data yet: this fills in as days pass.</p>;
  }

  const W = 800;
  const H = height;
  const pad = { top: 16, right: 16, bottom: 28, left: 40 };
  const max = Math.max(1, ...points.flatMap((p) => series.map((s) => s.get(p))));
  const niceMax = Math.ceil(max / 4) * 4 || 4;

  const x = (i: number) => pad.left + (i * (W - pad.left - pad.right)) / (points.length - 1);
  const y = (v: number) => H - pad.bottom - (v / niceMax) * (H - pad.top - pad.bottom);

  const line = (s: SeriesDef<T>) => points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(s.get(p)).toFixed(1)}`).join(" ");
  const area = (s: SeriesDef<T>) =>
    `${line(s)} L${x(points.length - 1).toFixed(1)},${(H - pad.bottom).toFixed(1)} L${x(0).toFixed(1)},${(H - pad.bottom).toFixed(1)} Z`;

  const ticks = [0, niceMax / 2, niceMax];
  const labelEvery = Math.max(1, Math.round(points.length / 6));

  return (
    <figure className="flex flex-col gap-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={caption}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={W - pad.right} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeWidth="1" />
            <text x={pad.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--color-muted)">{t}</text>
          </g>
        ))}

        {series.map((s) => (s.fill ? <path key={`${s.label}-fill`} d={area(s)} fill={s.fill} /> : null))}
        {series.map((s) => (
          <path key={s.label} d={line(s)} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        ))}

        {points.map((p, i) =>
          i % labelEvery === 0 || i === points.length - 1 ? (
            <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--color-muted)">
              {formatDayLabel(p.date)}
            </text>
          ) : null,
        )}
      </svg>

      <figcaption className="flex flex-wrap items-center gap-4 text-xs">
        {series.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5 font-bold">
            <span aria-hidden="true" className="h-0.5 w-4" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
        <span className="text-muted">{caption}</span>
      </figcaption>
    </figure>
  );
}
