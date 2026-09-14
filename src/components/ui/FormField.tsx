import clsx from "clsx";

const control =
  "mt-2 block w-full border-2 bg-white px-3 py-3 text-base text-ink placeholder:text-muted/70 focus:border-ink focus:outline-none focus-visible:outline-red";

function describedBy(id: string, error?: string) {
  return error ? `${id}-error` : undefined;
}

function Label({ id, label, optional }: { id: string; label: string; optional?: boolean }) {
  return (
    <label htmlFor={id} className="block text-sm font-bold">
      {label} {optional ? <span className="font-normal text-muted">(optional)</span> : <span aria-hidden="true" className="text-red-deep">*</span>}
    </label>
  );
}

function ErrorText({ id, error }: { id: string; error?: string }) {
  return error ? <p id={`${id}-error`} className="mt-1 text-sm font-semibold text-red-deep">{error}</p> : null;
}

interface Base { id: string; label: string; error?: string; optional?: boolean }

export function TextField({ id, label, error, optional, ...props }: Base & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <Label id={id} label={label} optional={optional} />
      <input id={id} name={id} aria-invalid={!!error} aria-describedby={describedBy(id, error)} required={!optional}
        className={clsx(control, error ? "border-red-deep" : "border-line")} {...props} />
      <ErrorText id={id} error={error} />
    </div>
  );
}

export function SelectField({ id, label, error, optional, options, placeholder, ...props }:
  Base & { options: { value: string; label: string }[]; placeholder: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <Label id={id} label={label} optional={optional} />
      <select id={id} name={id} aria-invalid={!!error} aria-describedby={describedBy(id, error)} required={!optional}
        className={clsx(control, error ? "border-red-deep" : "border-line")} {...props}>
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ErrorText id={id} error={error} />
    </div>
  );
}
