# Organization workspace (/org)

What exists, what doesn't, and what is still blocked. Written against the code
on this branch, not against plans.

## What works

- **Entry:** klymb.ai/org/sign-in (linked from the site footer, and from invite
  emails). Invited people ask for a 6-digit emailed code. `/org` sends a signed-in
  member to `/org/<slug>`.
- **Roles:** HR (People, Teams, Learning), team head (their team's Learning),
  employee (their own). Access is read from `course.company_members` on every
  request; removing a person ends access at once.
- **Course assignment (pilot):** HR assigns System Design to a person, to
  everyone who has none (after a confirmation showing the count), or takes it
  back. See below.
- **Learning page:** who has the course, lessons passed and final-assessment
  scores, per email, from `lesson_checks` and `final_attempts`.

## Not available (and shown as such in the UI)

Assigning anything other than System Design, assigning assessments, company
reports and exports, certificates, single sign-on, and any notification email
beyond the invite and its resend. Assigned employees get no reminder, release or
push emails: those crons read `course.enrollments`, and company access doesn't
create enrollments (see below).

## Pilot rule: assignment opens the course

An active company seat gets access to one existing course, **System Design**, for
the people HR assigns it to. Nobody else in the company can open it.

Access (`hasCourseAccess`, src/lib/access.ts) is, in order:

1. an active row in `course.enrollments` (a paid learner), exactly as before; or
2. all of: a Google-verified session email, an active company member with that
   exact email (`removed_at is null`), and a non-revoked row in
   `course.company_course_assignments` for the same company.

Step 2 is only asked when step 1 finds nothing, so paid learners' behaviour,
refunds, reminders and referrals are untouched.

**Why not an enrollment row?** Enrollments mean "paid": the reminder, release and
push crons email every active one, referrals and refunds act on them. A company
seat must do none of that.

**Seats.** `seat_count` is set by Klymb admin and caps active members (People
refuses to add past it, in the page and again inside the insert; admin can't set
it below the member count). An assignment needs an active member, so assignments
can't outnumber seats. The assign statements check it again anyway. "Assign to
everyone without it" is all-or-nothing: it assigns nobody if the number HR
confirmed has changed, or if it would pass the seat count.

**Wrong email / wrong company.**
- `company_course_assignments (company_id, email)` is a foreign key to
  `company_members (company_id, email)`: the database refuses an assignment that
  names another company's member. Access also needs `removed_at is null`, and an
  email can belong to one company only.
- HR acts only on their own company (`hrFor`), and every statement filters by
  that company id.
- The course accepts only a Google-verified session, never a company code, and
  the match on email is exact. A plus-alias or a different Google account won't
  match; the UI tells employees to use the exact invited email.
- Fails closed: an error reading assignments never opens the course. A missing
  table (migration not run) means nobody is assigned.

**Removing** stamps `revoked_at/revoked_by`; the row, and the person's lesson
record, stay. Assigning again clears the stamp.

## Audit log

HR People, Teams and assignment changes are recorded through `logAdmin` in the
**platform admin audit table**, `course.admin_audit_log` (append-only, read only
at `/admin/audit` behind `requireAdmin`). There is no separate company audit
table, so:

- the HR actor's email is stored in the `admin_email` column;
- the company is the `target` (id) with the slug in `details`;
- Klymb admins see these entries on `/admin/audit`; company HR cannot read the
  log at all.

Actions: `company.person_add`, `company.people_import`, `company.person_remove`,
`company.invite_resend`, `company.team_create`, `company.team_head`,
`company.person_move`, `company.course_assign`, `company.course_unassign`,
`company.course_assign_all`. Not logged: names, CSV contents, sign-in material.
A bulk assignment records a count, never the list of emails.
Cleaner long term: a `company_id`/`actor_kind` column or a company audit table,
which needs a migration.

## Migration

`db/migrations/0030_company_course_assignments.sql`. When it was written main
ended at 0025, and the older audit branch (`claude/klymb-ux-flow-audit-377d4b`)
held `0025_several_tracks` and 0026-0029 on a divergent line. That branch's five
migrations reached main renumbered as 0034-0038, after 0030-0033, so nothing
shares a number and a fresh database applies them in the order production did.
`scripts/migrate.ts` applies unapplied files by name, so gaps are harmless.
It adds one redundant unique constraint to `company_members` and one table; it is
idempotent. **Not yet applied to any shared database.**

## Verification status

- Type-check and lint: clean for the changed files.
- The migration and every assignment query were run against a disposable
  in-memory Postgres (PGlite), with migrations 0001-0030 applied (0004 skipped:
  `CREATE INDEX CONCURRENTLY` can't run there). 28 checks passed: access rule,
  wrong company/email, remove and restore, member removal, seat limit, bulk
  guards, paid-learner exclusion, progress flags, and the missing-table case.
  The harness lives outside the repo.
- **Blocked:** applying 0030 to Neon (or any shared database), and an end-to-end
  run (HR assigns in the browser, employee signs in with Google, lesson opens).
  That needs a disposable Postgres wired to the app plus a Google sign-in. The
  composition inside `hasCourseAccess` itself (enrollment first, then assignment)
  is type-checked but was not run through the app's own database client.

## Other notes

- `SITE_CLOSED` (src/lib/site-status.ts) does not keep `/org` open; if the site
  is closed, company sign-in is hidden too.
- A member whose work email is not a Google account cannot open the course.
