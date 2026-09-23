"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Country and device filters. They live in the URL, so a filtered view can be shared. */
export function GaFilters({ countries, devices }: { countries: string[]; devices: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function set(key: string, value: string) {
    const sp = new URLSearchParams(params.toString());
    if (value) sp.set(key, value); else sp.delete(key);
    router.replace(`${pathname}?${sp}`, { scroll: false });
  }

  const country = params.get("country") ?? "";
  const device = params.get("device") ?? "";
  const select = "rounded-lg border border-line/40 bg-card px-3 py-2 text-sm font-semibold focus:border-ink focus:outline-none";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="ga-country">Country</label>
      <select id="ga-country" value={country} onChange={(e) => set("country", e.target.value)} className={select}>
        <option value="">All countries</option>
        {countries.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <label className="sr-only" htmlFor="ga-device">Device</label>
      <select id="ga-device" value={device} onChange={(e) => set("device", e.target.value)} className={select}>
        <option value="">All devices</option>
        {devices.map((d) => <option key={d} value={d.toLowerCase()}>{d}</option>)}
      </select>
      {(country || device) && (
        <button
          type="button"
          onClick={() => {
            const sp = new URLSearchParams(params.toString());
            sp.delete("country");
            sp.delete("device");
            router.replace(`${pathname}?${sp}`, { scroll: false });
          }}
          className="rounded-lg px-3 py-2 text-sm font-bold text-red-deep hover:bg-red-tint"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
