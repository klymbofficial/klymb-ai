import Link from "next/link";
import { contact, socials } from "@/data/config";
import { brand, footerLinks } from "@/data/program";
import { tracks } from "@/data/tracks";
import { Wordmark } from "./Wordmark";

function Column({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <nav aria-label={title}>
      <h2 className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">{title}</h2>
      <ul className="mt-4 space-y-2 text-sm">
        {links.map((l) => <li key={l.href}><Link href={l.href} className="hover:text-red-deep">{l.label}</Link></li>)}
      </ul>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="border-t-2 border-line">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div>
          <Wordmark />
          <p className="mt-3 max-w-xs text-sm text-muted">{brand.tagline}</p>
          <a href={`mailto:${contact.email}`} className="mt-4 inline-block text-sm font-semibold underline underline-offset-4">{contact.email}</a>
          <ul className="mt-4 flex flex-wrap gap-3">
            {socials.map((s) => (
              <li key={s.href}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 border-2 border-line px-2.5 py-1.5 text-xs font-bold transition-colors hover:border-ink"
                >
                  {s.label}
                  <span className="text-muted">{s.handle}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
        <Column title="Career Tracks" links={tracks.map((t) => ({ label: t.name, href: `/tracks/${t.slug}` }))} />
        <Column title="Program" links={footerLinks.program} />
        <Column title="Company" links={footerLinks.company} />
      </div>
      <div className="border-t-2 border-line">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-muted sm:px-6">
          © {new Date().getFullYear()} {brand.name}. Klymb.ai does not guarantee employment, placement or salary outcomes.
        </p>
      </div>
    </footer>
  );
}
