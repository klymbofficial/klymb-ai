"use client";

import clsx from "clsx";
import { useEffect, useId, useRef, useState } from "react";
import type { CollegeOption } from "@/lib/colleges";

/**
 * The college field: type and pick from app.klymb.ai's list of Indian
 * colleges, or keep what you typed if yours isn't there. Submits the name as
 * `college`, like the plain text field it replaces.
 */
export function CollegeField({ defaultValue, error }: { defaultValue: string; error?: string }) {
  const [value, setValue] = useState(defaultValue);
  const [options, setOptions] = useState<CollegeOption[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const typed = useRef(false);
  const listId = useId();

  useEffect(() => {
    if (!typed.current) return;
    const q = value.trim();
    if (q.length < 2) return;
    const ctrl = new AbortController();
    const t = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/colleges?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const body = (await res.json()) as { colleges?: CollegeOption[] };
        setOptions(body.colleges ?? []);
        setActive(-1);
      } catch {
        // Aborted or offline: the field still takes what's typed.
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => { ctrl.abort(); window.clearTimeout(t); };
  }, [value]);

  function pick(o: CollegeOption) {
    typed.current = false;
    setValue(o.name);
    setOptions([]);
    setOpen(false);
  }

  const shown = open && options.length > 0;
  const place = (o: CollegeOption) => [o.district, o.state].filter(Boolean).join(", ");

  return (
    <div className="relative">
      <label htmlFor="college" className="block text-[13px] font-bold">College <span aria-hidden="true" className="text-red-deep">*</span></label>
      <input
        id="college"
        name="college"
        required
        autoComplete="off"
        role="combobox"
        aria-expanded={shown}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={shown && active >= 0 ? `${listId}-${active}` : undefined}
        aria-invalid={!!error}
        aria-describedby={error ? "college-error" : "college-hint"}
        placeholder="Start typing your college's name"
        value={value}
        onChange={(e) => {
          typed.current = true;
          setValue(e.target.value);
          setOpen(true);
          if (e.target.value.trim().length < 2) setOptions([]);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (!shown) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % options.length); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a <= 0 ? options.length - 1 : a - 1)); }
          else if (e.key === "Enter" && active >= 0) { e.preventDefault(); pick(options[active]); }
          else if (e.key === "Escape") setOpen(false);
        }}
        className={clsx(
          "mt-1.5 block w-full rounded-lg border bg-surface/45 px-3.5 py-2 text-sm text-ink transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-muted/70 focus:bg-white focus:outline-none focus-visible:outline-none",
          error ? "border-error/60 focus:border-error/70 focus:ring-4 focus:ring-error/10" : "border-line/50 hover:border-line/80 focus:border-ink/50 focus:ring-4 focus:ring-ink/5",
        )}
      />
      {shown && (
        <ul id={listId} role="listbox" aria-label="Colleges" className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-auto rounded-lg border border-line/40 bg-white py-1 shadow-lg">
          {options.map((o, i) => (
            <li
              key={o.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); pick(o); }}
              onMouseEnter={() => setActive(i)}
              className={clsx("cursor-pointer px-3.5 py-2 text-sm", i === active && "bg-surface")}
            >
              <span className="block font-semibold text-ink">{o.name}</span>
              {place(o) && <span className="block text-xs text-muted">{place(o)}</span>}
            </li>
          ))}
        </ul>
      )}
      {error
        ? <p id="college-error" className="mt-1.5 text-xs font-medium text-error">{error}</p>
        : <p id="college-hint" className="mt-1.5 text-xs text-muted">{loading ? "Searching…" : "Pick from the list, or type it in full if it isn't there."}</p>}
    </div>
  );
}
