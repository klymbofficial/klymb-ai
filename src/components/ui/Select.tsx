"use client";

import clsx from "clsx";
import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown } from "lucide-react";

export interface SelectOption { value: string; label: string; disabled?: boolean; hint?: string }

const trigger =
  "mt-1.5 flex w-full items-center justify-between gap-2 rounded-lg border bg-surface/45 px-3.5 py-2 text-left text-sm transition-[border-color,box-shadow,background-color] duration-200 focus:bg-white focus:outline-none focus-visible:outline-none";
const normal = "border-line/50 hover:border-line/80 focus:border-ink/50 focus:ring-4 focus:ring-ink/5";
const invalid = "border-error/60 focus:border-error/70 focus:ring-4 focus:ring-error/10";

/**
 * A custom dropdown with listbox semantics: focus stays on the trigger and
 * `aria-activedescendant` points at the highlighted option, so screen readers
 * follow along. Arrow keys, Home/End, Enter, Space, Escape and type-ahead all
 * work; it opens upwards when there is no room below.
 */
export function SelectField({
  id, label, error, optional, options, placeholder, value, onValueChange,
}: {
  id: string; label: string; error?: string; optional?: boolean;
  options: SelectOption[]; placeholder: string; value: string; onValueChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [upward, setUpward] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const listId = `${useId().replace(/:/g, "")}-list`;

  const selected = options.find((o) => o.value === value);
  const enabled = (i: number) => i >= 0 && i < options.length && !options[i].disabled;

  function step(from: number, dir: 1 | -1) {
    for (let i = from + dir; i >= 0 && i < options.length; i += dir) if (enabled(i)) return i;
    return from;
  }

  function openList() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const below = window.innerHeight - rect.bottom;
      setUpward(below < 280 && rect.top > below);
    }
    const current = options.findIndex((o) => o.value === value);
    setActive(enabled(current) ? current : step(-1, 1));
    setOpen(true);
  }

  function choose(i: number) {
    if (!enabled(i)) return;
    onValueChange(options[i].value);
    setOpen(false);
    buttonRef.current?.focus();
  }

  // Close on a press anywhere else.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // Keep the highlighted option in view while arrowing through a long list.
  useEffect(() => {
    if (open && active >= 0) listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); setActive((i) => step(i, 1)); break;
      case "ArrowUp": e.preventDefault(); setActive((i) => step(i, -1)); break;
      case "Home": e.preventDefault(); setActive(step(-1, 1)); break;
      case "End": e.preventDefault(); setActive(step(options.length, -1)); break;
      case "Enter":
      case " ": e.preventDefault(); choose(active); break;
      case "Escape": e.preventDefault(); setOpen(false); break;
      case "Tab": setOpen(false); break;
      default:
        // Type-ahead: letters typed in quick succession jump to a match.
        if (e.key.length === 1 && /\S/.test(e.key)) {
          const now = Date.now();
          typed.current.text = (now - typed.current.at < 600 ? typed.current.text : "") + e.key.toLowerCase();
          typed.current.at = now;
          const match = options.findIndex((o, i) => enabled(i) && o.label.toLowerCase().startsWith(typed.current.text));
          if (match >= 0) setActive(match);
        }
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <label htmlFor={id} className="block text-[13px] font-bold">
        {label} {optional ? <span className="font-normal text-muted">(optional)</span> : <span aria-hidden="true" className="text-red-deep">*</span>}
      </label>

      <button
        ref={buttonRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        aria-required={!optional}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={clsx(trigger, error ? invalid : normal, open && "border-ink/50 bg-white ring-4 ring-ink/5")}
      >
        <span className={clsx("truncate", selected ? "text-ink" : "text-muted")}>{selected?.label ?? placeholder}</span>
        <ChevronDown
          aria-hidden="true"
          className={clsx("size-4 shrink-0 text-muted transition-transform duration-200", open && "rotate-180 text-ink")}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-labelledby={id}
            initial={{ opacity: 0, y: upward ? 6 : -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: upward ? 4 : -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.2, 0.7, 0.3, 1] }}
            className={clsx(
              "absolute inset-x-0 z-30 max-h-64 overflow-y-auto rounded-xl bg-card p-1.5 shadow-float ring-1 ring-line/20",
              upward ? "bottom-full mb-1.5 origin-bottom" : "top-full mt-1.5 origin-top",
            )}
          >
            {options.map((o, i) => {
              const isSelected = o.value === value;
              return (
                <li
                  key={o.value}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={o.disabled || undefined}
                  onPointerEnter={() => enabled(i) && setActive(i)}
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => choose(i)}
                  className={clsx(
                    "flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-100",
                    o.disabled ? "cursor-not-allowed text-muted/60" : "cursor-pointer",
                    i === active && !o.disabled && "bg-surface/70",
                    isSelected && "font-semibold text-ink",
                  )}
                >
                  <span className="truncate">{o.label}</span>
                  {o.hint && (
                    <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">{o.hint}</span>
                  )}
                  {isSelected && <Check aria-hidden="true" className="size-4 shrink-0 text-red-deep" strokeWidth={2.5} />}
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>

      {error && <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-error">{error}</p>}
    </div>
  );
}
