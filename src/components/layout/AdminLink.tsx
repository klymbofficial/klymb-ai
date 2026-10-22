"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * "Admin", shown only once the server says this visitor is on the admin list.
 * Asks after load, so public pages stay static for everyone else.
 */
export function AdminLink({ className, onClick }: { className?: string; onClick?: () => void }) {
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    let live = true;
    fetch("/api/admin/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { admin?: boolean } | null) => live && setAdmin(d?.admin === true))
      .catch(() => {});
    return () => { live = false; };
  }, []);

  if (!admin) return null;
  return <Link href="/admin" prefetch={false} onClick={onClick} className={className}>Admin</Link>;
}
