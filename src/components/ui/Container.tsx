import clsx from "clsx";

export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={clsx("mx-auto w-full max-w-7xl px-4 sm:px-6", className)}>{children}</div>;
}
