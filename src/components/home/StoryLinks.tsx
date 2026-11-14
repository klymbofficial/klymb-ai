import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Appear } from "@/components/motion/Appear";

/** Two quiet doors from Home to the reasoning and the people behind it. */
export function StoryLinks() {
  const items = [
    { href: "/why-klymb", title: "Why Klymb", body: "Why we build it around real work, not videos and certificates." },
    { href: "/about", title: "About and mission", body: "What Klymb is for, who runs it and how to reach us." },
  ];
  return (
    <section aria-label="More about Klymb" className="mx-auto max-w-7xl px-4 pb-6 sm:px-6">
      <ul className="grid gap-4 sm:grid-cols-2">
        {items.map((it, i) => (
          <li key={it.href}>
            <Appear delay={i * 0.05} className="h-full">
              <Link href={it.href} className="card group flex h-full items-center justify-between gap-4 p-6 transition-transform duration-150 hover:-translate-y-0.5">
                <span>
                  <span className="display block text-xl">{it.title}</span>
                  <span className="mt-1 block text-sm text-muted">{it.body}</span>
                </span>
                <ArrowRight aria-hidden="true" className="size-5 shrink-0 text-red-strong transition-transform duration-150 group-hover:translate-x-0.5" />
              </Link>
            </Appear>
          </li>
        ))}
      </ul>
    </section>
  );
}
