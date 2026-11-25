"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";
import { labelOf, linkOf } from "@/lib/click-tracking";

/**
 * Counts every tap on a link or button on the public site, as one ui_click
 * event with what was tapped, what kind of link it was and where it went.
 * Admin pages are left out, and so is anything inside [data-no-track].
 */
export function ClickTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      const el = target?.closest<HTMLElement>("a[href], button, [role='button'], summary");
      if (!el || el.closest("[data-no-track]")) return;
      const href = el instanceof HTMLAnchorElement ? el.getAttribute("href") : null;
      const { type, url } = linkOf(href, window.location.href);
      const label = labelOf(el) || url || el.tagName.toLowerCase();
      trackEvent(
        "ui_click",
        { link_label: label, link_type: type, link_url: url, page_path: window.location.pathname },
        { label, page: window.location.pathname },
      );
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [pathname]);

  return null;
}
