import type { CSSProperties } from "react";

/** A darker shade of #rrggbb, for hover and pressed states. */
function darker(hex: string, by = 0.15): string {
  const channel = (i: number) => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - by)).toString(16).padStart(2, "0");
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

/**
 * Props for a subtree in a company's accent: buttons, link hovers and the
 * focus ring inside follow it (the rules under [data-brand] in globals.css,
 * and --color-red, which the focus ring reads). The accent is checked to
 * carry white text at WCAG AA before it is ever saved (branding.ts).
 * Nothing is set without one, so Klymb's own colours stay.
 */
export function brandProps(accent: string | null): { style?: CSSProperties; "data-brand"?: "" } {
  if (!accent || !/^#[0-9a-f]{6}$/.test(accent)) return {};
  return {
    "data-brand": "",
    style: { "--color-red": accent, "--brand-accent": accent, "--brand-press": darker(accent) } as CSSProperties,
  };
}
