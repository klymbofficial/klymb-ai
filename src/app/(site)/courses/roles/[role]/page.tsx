import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AskUs } from "@/components/catalog/AskUs";
import { Discovery } from "@/components/catalog/Discovery";
import { ProgramGroups } from "@/components/catalog/ProgramGroups";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { availableIn, getRole, programsForRole, roles } from "@/data/catalog";

export function generateStaticParams() {
  return roles.map((r) => ({ role: r.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ role: string }> }): Promise<Metadata> {
  const role = getRole((await params).role);
  if (!role) return {};
  return { title: `${role.name} courses`, description: `Klymb.ai courses for ${role.name.toLowerCase()}: what is open for enrolment and what is not available.` };
}

export default async function RolePage({ params }: { params: Promise<{ role: string }> }) {
  const role = getRole((await params).role);
  if (!role) notFound();
  const list = programsForRole(role.slug);
  const noneOpen = availableIn(list).length === 0;

  return (
    <>
      <section aria-labelledby="role-title" className="mx-auto max-w-7xl px-4 pb-6 sm:px-6">
        <div className="card rounded-slab p-8 shadow-float sm:p-12">
          <nav aria-label="Breadcrumb" className="text-sm font-semibold text-muted">
            <Link href="/courses" className="hover:text-red-deep hover:underline">Courses</Link> <span aria-hidden="true">/</span> By role
          </nav>
          <Eyebrow className="mt-5">Role</Eyebrow>
          <h1 id="role-title" className="display mt-3 text-[clamp(2.1rem,5vw,3.5rem)] text-balance">{role.name}</h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted sm:text-base">{role.blurb}</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <ProgramGroups
          list={list}
          emptyOpen="No course for this role is open for enrolment yet. The programs below are not available."
        />
        {noneOpen && (
          <AskUs className="mt-10" subject={`Courses for ${role.name}`} title="Need something for this role?">
            <p>There is nothing to enrol in for this role today. If you or your team need it, email us what you are looking for.</p>
          </AskUs>
        )}
      </section>

      <section aria-label="Browse other roles and industries" className="mx-auto max-w-7xl px-4 pt-4 pb-16 sm:px-6 sm:pb-24">
        <Discovery active={{ kind: "role", slug: role.slug }} />
      </section>
    </>
  );
}
