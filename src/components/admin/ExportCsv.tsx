"use client";

/** Downloads whatever rows the page is showing, so numbers can be checked in a spreadsheet. */
export function ExportCsv<T extends object>({
  rows, filename,
}: { rows: readonly T[]; filename: string }) {
  function download() {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]) as (keyof T)[];
    const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [headers.map((h) => cell(String(h))).join(","), ...rows.map((r) => headers.map((h) => cell(r[h])).join(","))].join("\n");

    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={!rows.length}
      className="rounded-lg border border-line/50 px-3 py-1.5 text-xs font-bold hover:bg-ink hover:text-paper disabled:opacity-40"
    >
      Export CSV
    </button>
  );
}
