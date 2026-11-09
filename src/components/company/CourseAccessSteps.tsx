import { ButtonLink } from "@/components/ui/Button";

/**
 * How an invited employee reaches a course, from what the code does today:
 *
 *   * the course app signs in with Google only; a company sign-in code is
 *     ignored there (verifiedEmailFrom in src/auth.ts);
 *   * its lessons open only for an email with an active enrolment, and
 *     today the only thing that creates one is a payment;
 *   * company membership is not consulted by the course at all.
 *
 * So the steps say what is true: access is set up by Klymb, not by joining
 * a company, and it is the same email on both sides.
 */
export function CourseAccessSteps({ email, hasAccess }: { email: string; hasAccess: boolean }) {
  return (
    <section aria-labelledby="reach" className="card max-w-2xl p-6">
      <h2 id="reach" className="display text-lg">How to reach your course</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted">
        <li>
          <span className="font-semibold text-ink">Course access is set up for your email.</span>{" "}
          {hasAccess
            ? `Klymb has System Design set up for ${email}.`
            : `Klymb doesn't have a course set up for ${email} yet. Joining your company doesn't set one up. Ask your HR contact, who can write to Klymb.`}
        </li>
        <li>
          <span className="font-semibold text-ink">Sign in to the course with Google.</span>{" "}
          Use a Google account for {email}. The course doesn&apos;t accept the code you used here, and there is no single sign-on.
        </li>
        <li>
          <span className="font-semibold text-ink">Your progress appears here</span> once you&apos;ve passed a lesson, under that same email.
        </li>
      </ol>
      {hasAccess && <ButtonLink href="/learn/system-design" arrow className="mt-5">Open the course</ButtonLink>}
    </section>
  );
}
