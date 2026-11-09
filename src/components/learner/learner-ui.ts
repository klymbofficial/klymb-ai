import clsx from "clsx";

/**
 * One set of button shapes for the whole learner area, so a primary action
 * looks the same on the dashboard, the day page and the submission form.
 *
 *  - primary:   the one next action on a screen
 *  - secondary: any other action
 *  - onDark:    a primary action sitting on the red or night surfaces
 *
 * Plain class strings, so they work on a <Link>, an <a> or a <button>.
 */
const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-center text-sm font-bold transition-[background-color,color,border-color,transform] duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-strong disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100";

const variants = {
  primary: "bg-red-strong text-white hover:bg-red-press",
  secondary: "border-2 border-ink/80 bg-transparent text-ink hover:bg-ink hover:text-paper",
  onDark: "bg-paper text-red-deep hover:bg-white focus-visible:outline-white",
  onDarkSecondary: "border-2 border-white/60 bg-transparent text-white hover:bg-white hover:text-ink focus-visible:outline-white",
} as const;

export type LearnerButtonVariant = keyof typeof variants;

export function learnerButton(variant: LearnerButtonVariant = "primary", className?: string) {
  return clsx(base, variants[variant], className);
}
