# Organization workspace (/org)

What exists, what doesn't, and what blocks launch. Written against the code on
this branch, not against plans.

## What works

- **Entry:** klymb.ai/org/sign-in (linked from the site footer, and from invite
  emails). Invited people ask for a 6-digit emailed code. `/org` sends a signed-in
  member to `/org/<slug>`.
- **Roles:** HR (People, Teams, Learning), team head (their team's Learning),
  employee (their own). Access is read from `course.company_members` on every
  request; removing a person ends access at once.
- **Learning page:** System Design access, lessons passed and final-assessment
  scores, per email, from `enrollments`, `lesson_checks`, `final_attempts`.

## Not available (and shown as such in the UI)

Course or assessment assignment, company reports and exports, certificates,
single sign-on, and any notification email beyond the invite and its resend.

## Launch blocker: an invited employee cannot reach a course

Traced from the code (not run end to end):

1. A company code sign-in is ignored by the course app: `verifiedEmailFrom`
   (src/auth.ts) refuses `signInMethod === "email-code"`. The course needs Google.
2. Signing in to the course with Google, using the same work email, works as an
   identity (company pages also accept a Google-verified email).
3. But the lessons open only for an email with an active row in
   `course.enrollments` (`hasCourseAccess`, src/lib/access.ts; `FREE_LESSONS` is
   empty). The only code that inserts into `enrollments` is the payment flow
   (src/lib/payments.ts). Nothing reads `company_members` to grant access, and
   `HIDE_MONEY` hides the pay pages, so an employee cannot buy it either.
4. Company members cannot also be learners on a track (People rejects an email
   that is already in `course.learners`), so the 30-day tracks are not an option.

Result: an employee can sign in to the course with Google but sees the locked
course, unless someone at Klymb has inserted an enrollment by hand. The
workspace says this plainly (Overview and Learning, employee view).

Proposed fix (needs a decision, not built): a company-granted enrollment, e.g.
`enrollments.source = 'company'` with `company_id` and `granted_by`, created by
HR from the workspace or by Klymb admin, plus whether a seat includes a course.
That is a migration and a commercial rule.

## Audit log

HR People and Teams changes are recorded through `logAdmin` in the **platform
admin audit table**, `course.admin_audit_log` (append-only, read only at
`/admin/audit` behind `requireAdmin`). There is no separate company audit table,
so:

- the HR actor's email is stored in the `admin_email` column;
- the company is the `target` (id) with the slug in `details`;
- Klymb admins see these entries on `/admin/audit`; company HR cannot read the
  log at all.

Actions: `company.person_add`, `company.people_import`, `company.person_remove`,
`company.invite_resend`, `company.team_create`, `company.team_head`,
`company.person_move`. Not logged: names, CSV contents, sign-in material.
Cleaner long term: a `company_id`/`actor_kind` column or a company audit table,
which needs a migration.

## Other notes

- Migrations: none added. Main has 0001–0013 and 0020–0025; the older audit
  branch holds 0026–0029 on a divergent line.
- `SITE_CLOSED` (src/lib/site-status.ts) does not keep `/org` open; if the site
  is closed, company sign-in is hidden too.
