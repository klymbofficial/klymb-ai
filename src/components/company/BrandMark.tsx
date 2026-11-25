"use client";

import clsx from "clsx";
import { useState } from "react";
import { brandInitials } from "@/lib/company/branding";

/**
 * A company's logo, or a readable stand-in: when there is no logo, or it
 * fails to load, its initials in a tile beside the name. The logo always sits
 * on a white tile, since most logos are drawn for white, whatever the band
 * behind it. The name is always present as text for screen readers.
 */
export function BrandMark({
  name, logoUrl, logoAlt, size = "sm", showName = true, stack = false, className,
}: {
  name: string;
  logoUrl: string | null;
  logoAlt?: string;
  size?: "sm" | "lg";
  /** Show the name beside a logo too (it is always shown beside the initials). */
  showName?: boolean;
  /** The name under the mark rather than beside it, for narrow places. */
  stack?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const logo = logoUrl && !failed;
  const tile = size === "lg" ? "h-14 min-w-14 px-2" : "h-9 min-w-9 px-1.5";

  return (
    <span className={clsx("inline-flex min-w-0 max-w-full", stack ? "flex-col items-start gap-1.5" : "items-center gap-3", className)}>
      <span className={clsx("inline-flex shrink-0 items-center justify-center bg-white", tile)}>
        {logo ? (
          // A plain img: the logo comes from Klymb's own route, sized by its own proportions.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={showName ? "" : (logoAlt ?? `${name} logo`)}
            onError={() => setFailed(true)}
            className={clsx("w-auto object-contain", size === "lg" ? "max-h-11 max-w-44" : "max-h-7 max-w-28")}
          />
        ) : (
          <span aria-hidden="true" className={clsx("font-black tracking-tight text-ink", size === "lg" ? "text-xl" : "text-sm")}>
            {brandInitials(name)}
          </span>
        )}
      </span>
      {(showName || !logo) && <span className={clsx("min-w-0 max-w-full font-bold", stack ? "break-words" : "truncate", size === "lg" ? "text-xl" : "text-sm")}>{name}</span>}
    </span>
  );
}
