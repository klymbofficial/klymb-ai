import clsx from "clsx";

/*
 * One focus cue, not two: the border darkens and a faint ring spreads, and the
 * site-wide focus outline is switched off here so it cannot stack on top.
 */
const control =
  "mt-1.5 block w-full rounded-lg border bg-surface/45 px-3.5 py-2 text-sm text-ink transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-muted/70 focus:bg-white focus:outline-none focus-visible:outline-none";
const normal = "border-line/50 hover:border-line/80 focus:border-ink/50 focus:ring-4 focus:ring-ink/5";
const invalid = "border-error/60 focus:border-error/70 focus:ring-4 focus:ring-error/10";

function describedBy(id: string, error?: string) {
  return error ? `${id}-error` : undefined;
}

function Label({ id, label, optional }: { id: string; label: string; optional?: boolean }) {
  return (
    <label htmlFor={id} className="block text-[13px] font-bold">
      {label} {optional ? <span className="font-normal text-muted">(optional)</span> : <span aria-hidden="true" className="text-red-deep">*</span>}
    </label>
  );
}

function ErrorText({ id, error }: { id: string; error?: string }) {
  return error ? <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-error">{error}</p> : null;
}

interface Base { id: string; label: string; error?: string; optional?: boolean }

export function TextField({ id, label, error, optional, ...props }: Base & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <Label id={id} label={label} optional={optional} />
      <input id={id} name={id} aria-invalid={!!error} aria-describedby={describedBy(id, error)} required={!optional}
        spellCheck={props.type === "email" || props.type === "tel" || props.type === "url" ? false : undefined}
        className={clsx(control, error ? invalid : normal)} {...props} />
      <ErrorText id={id} error={error} />
    </div>
  );
}
