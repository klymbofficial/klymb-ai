import clsx from "clsx";
import Link from "next/link";
import { CONTACT_PAGE, contactEmail, contactMailto } from "@/data/catalog";

/**
 * How to reach the team about something that is not built. Uses the contact
 * route that exists (the address on /contact). It promises no reply time and
 * no call, demo or trial, because the app has none to offer.
 */
export function AskUs({ subject, title, children, dark, className }: { subject: string; title: string; children: React.ReactNode; dark?: boolean; className?: string }) {
  return (
    <div className={clsx("rounded-card p-6 sm:p-8", dark ? "bg-night text-paper" : "card", className)}>
      <h2 className="display text-2xl">{title}</h2>
      <div className={clsx("mt-3 max-w-2xl text-[15px] leading-relaxed", dark ? "text-white/75" : "text-muted")}>{children}</div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <a
          href={contactMailto(subject)}
          className={clsx(
            "inline-flex items-center justify-center rounded-lg px-5 py-3 text-sm font-bold transition-colors",
            dark ? "bg-paper text-red-deep hover:bg-white" : "bg-red-strong text-white hover:bg-red-press",
          )}
        >
          Email {contactEmail}
        </a>
        <Link href={CONTACT_PAGE} className={clsx("text-sm font-bold underline underline-offset-4", dark ? "text-white hover:text-red-soft" : "text-ink hover:text-red-deep")}>
          Contact page
        </Link>
      </div>
    </div>
  );
}
