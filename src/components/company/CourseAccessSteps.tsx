import { ButtonLink } from "@/components/ui/Button";

/**
 * How an invited employee reaches the course, from what the code does:
 *
 *   * HR assigns System Design to a person (course.company_course_assignments);
 *   * the course signs in with Google only, and a company sign-in code is
 *     ignored there (verifiedEmailFrom in src/auth.ts);
 *   * its lessons open for a Google-verified email that is an active member
 *     of the company, with a non-revoked assignment (hasCourseAccess).
 *
 * So the steps say: assigned by HR, then Google with this same email.
 */
export function CourseAccessSteps({ email, hasAccess }: { email: string; hasAccess: boolean }) {
  return (
    <section aria-labelledby="reach" className="card max-w-2xl p-6">
      <h2 id="reach" className="display text-lg">How to reach your course</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted">
        <li>
          <span className="font-semibold text-ink">Your HR contact assigns it to you.</span>{" "}
          {hasAccess
            ? "System Design is assigned to you."
            : "It isn't assigned to you yet. Joining your company doesn't open it by itself."}
        </li>
        <li>
          <span className="font-semibold text-ink">Sign in to the course with Google.</span>{" "}
          Use a Google account for {email}, the same email HR assigned. The course doesn&apos;t accept the code you used here, and there is no single sign-on.
        </li>
        <li>
          <span className="font-semibold text-ink">Your progress appears here</span> once you&apos;ve passed a lesson, under that same email.
        </li>
      </ol>
      {hasAccess && <ButtonLink href="/learn/system-design" arrow className="mt-5">Open the course</ButtonLink>}
    </section>
  );
}
