import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BrandMark } from "@/components/company/BrandMark";
import { BTN_PRIMARY, BTN_SECONDARY, OrgPageHead } from "@/components/company/HiringParts";
import { LoadError } from "@/components/company/OrgPanels";
import { learnBase, longDate } from "@/components/company/learn/LearnerParts";
import { PrintButton } from "@/components/company/learn/PrintButton";
import { requireCompany } from "@/lib/company/auth";
import { getPublishedBrand } from "@/lib/company/branding-data";
import { certificateId, loadLearner } from "@/lib/company/learner-data";
import { trackedCourse } from "@/lib/company/upskill-course";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "Certificate", robots: { index: false, follow: false } };

/**
 * The certificate for a company-assigned course (user, 26 Nov), once the
 * final reaches the mark: the learner's name, the course, the company, the
 * date and the score. "Download PDF" prints only the certificate, landscape.
 */
export default async function CertificatePage({ params }: { params: Promise<{ slug: string; course: string }> }) {
  const { slug, course: courseSlug } = await params;
  const member = await requireCompany(slug);
  const course = trackedCourse(courseSlug);
  if (!course) notFound();
  const home = `/org/${member.companySlug}/learning`;
  const base = learnBase(member.companySlug, course.slug);
  const crumbs = [{ href: home, label: "My Upskill" }, { href: base, label: course.title }, { label: "Certificate" }];

  const sql = db();
  const [me, brand] = await Promise.all([sql ? loadLearner(sql, member) : Promise.resolve(undefined), getPublishedBrand(member)]);
  if (me === null) redirect(home);
  if (!me) return <><OrgPageHead crumbs={crumbs} title="Certificate" /><LoadError what="Your certificate" /></>;
  if (!me.certifiedAt) redirect(base);

  const id = certificateId(member.email, course.slug, member.companyId);
  return (
    <>
      {/* Print the certificate alone, on one landscape page. */}
      <style>{`@media print { @page { size: A4 landscape; margin: 0; } body * { visibility: hidden !important; } #certificate, #certificate * { visibility: visible !important; } #certificate { position: fixed; inset: 0; margin: 0; border-radius: 0; box-shadow: none; } }`}</style>
      <OrgPageHead
        crumbs={crumbs}
        title="Your certificate"
        meta={<span>Passed on {longDate(me.certifiedAt)} with {me.finalBest}%</span>}
        actions={<><PrintButton className={BTN_PRIMARY}>Download PDF</PrintButton><Link href={base} className={BTN_SECONDARY}>Back to the course</Link></>}
      />
      <article id="certificate" aria-label="Certificate of completion" className="relative mx-auto flex aspect-[1.414] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-line/30 bg-white p-[5%] text-center shadow-sm">
        <div aria-hidden="true" className="pointer-events-none absolute inset-[2.5%] rounded border-2 border-red-strong/25" />
        <div className="flex items-center justify-between gap-4">
          <BrandMark name={brand.name} logoUrl={brand.logoUrl} logoAlt={brand.logoAlt} />
          <span className="text-[clamp(11px,1.4vw,14px)] font-semibold text-muted">Powered by <span className="font-black tracking-tight text-ink">Klymb.ai</span></span>
        </div>
        <div className="my-auto flex flex-col items-center">
          <p className="text-[clamp(10px,1.5vw,14px)] font-bold uppercase tracking-[0.25em] text-red-strong">Certificate of completion</p>
          <p className="mt-[3%] text-[clamp(11px,1.6vw,16px)] text-muted">This certifies that</p>
          <p className="display mt-2 break-words text-[clamp(22px,4.5vw,44px)] leading-tight">{me.name ?? member.email}</p>
          <p className="mt-3 text-[clamp(11px,1.6vw,16px)] text-muted">has completed</p>
          <p className="mt-1 text-[clamp(16px,2.8vw,28px)] font-bold">{course.title}</p>
          <p className="mt-3 max-w-xl text-[clamp(10px,1.4vw,14px)] text-muted">
            {course.lessons.length} lessons across {course.modules.length} modules, each with a passed check, and the final assessment with a score of {me.finalBest}%.
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-4 border-t border-line/30 pt-[2.5%] text-[clamp(9px,1.3vw,13px)]">
          <div><dt className="text-muted">Date</dt><dd className="font-semibold">{longDate(me.certifiedAt)}</dd></div>
          <div><dt className="text-muted">Assigned by</dt><dd className="font-semibold">{brand.name}</dd></div>
          <div><dt className="text-muted">Certificate ID</dt><dd className="font-mono font-semibold">{id}</dd></div>
        </dl>
      </article>
      <p className="mx-auto mt-4 max-w-4xl text-sm text-muted">Tip: in the print window choose &quot;Save as PDF&quot;. Share it on LinkedIn or keep it for your records.</p>
    </>
  );
}
