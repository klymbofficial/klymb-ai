/** Extra sign-in guidance stays available without dominating the course view. */
export function CourseAccessSteps({ email, hasAccess }: { email: string; hasAccess: boolean }) {
  return (
    <details className="rounded-lg border border-line/30 bg-white p-5 text-sm">
      <summary className="w-fit cursor-pointer font-semibold">Help accessing your course</summary>
      <ol className="mt-4 grid gap-3 sm:grid-cols-3">
        <li className="rounded-md bg-slate-50 p-4"><strong className="block">Course access</strong><p className="mt-1 text-muted">{hasAccess ? "Your course is available." : "Ask your admin to assign System Design."}</p></li>
        <li className="rounded-md bg-slate-50 p-4"><strong className="block">Google sign-in</strong><p className="mt-1 break-words text-muted">Use {email}. Company sign-in codes do not work in the course.</p></li>
        <li className="rounded-md bg-slate-50 p-4"><strong className="block">Track progress</strong><p className="mt-1 text-muted">Activity under that email appears in Upskill.</p></li>
      </ol>
    </details>
  );
}
