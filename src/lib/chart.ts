/** Short date label for chart axes: 3 Sep. */
export function formatDayLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }).format(d);
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function formatCompact(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toLocaleString("en-IN");
}
