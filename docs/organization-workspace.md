# Organization workspace (/org)

What exists, what doesn't, and what is still blocked. Written against the code
on this branch, not against plans.

## What works

- **Entry:** klymb.ai/org/sign-in (linked from the site footer, and from invite
  emails). Invited people ask for a 6-digit emailed code. `/org` sends a signed-in
  member to `/org/<slug>`. A signed-out visitor to any `/org/<slug>/…` page is
  sent to `/org/sign-in?next=…` and returned to that page afterwards
  (`src/lib/company/return-path.ts`; `src/proxy.ts` passes the path to the layout).
  Only a path inside a workspace on this site is followed.
- **Workspace from the link:** every `/org/<slug>` page, layout and action
  resolves the viewer's membership of the company the URL names
  (`workspaceLookup` in `src/lib/company/lookup.ts`), not "their" company. A
  member of another company gets a 404.
- **Roles:** HR (People, Teams, Upskill), team head (Team Upskill),
  employee (their own). Access is read from `course.company_members` on every
  request; removing a person ends access at once.
- **Course assignment (pilot):** HR assigns System Design to a person, to
  everyone who has none (after a confirmation showing the count), or takes it
  back. See below.
- **Upskill page:** who has the course, lessons passed and final-assessment
  scores, per email, from `lesson_checks` and `final_attempts`.

- **Branding (T02):** a company admin sets display name, logo (uploaded PNG,
  JPEG or WebP up to 512 KB), accent (must carry white text at 4.5:1),
  welcome text and support contact at `/org/<slug>/branding`, saves a draft,
  previews it and publishes it (`course.company_branding`, migration 0073).
  Only the published version shows: the workspace band and pages, the branded
  sign-in page at `/org/<slug>/sign-in` (where invites and deep links lead),
  invite emails, and an "Assigned by" mark on a System Design course the
  company assigned. Personal Klymb pages keep Klymb's look. Logos are served
  from `/api/company-brand/<company>/<file>`: published ones to anyone, drafts
  only to that company's admins.
- **Deploying branding:** logos are stored in R2 under `company-brand/` in the
  lesson bucket. Production and previews need `R2_WRITE_ACCESS_KEY_ID` and
  `R2_WRITE_SECRET_ACCESS_KEY` in Vercel (the app's usual R2 keys only read);
  without them, uploads say they aren't available. On a laptop, uploads go to
  `.data/` unless `BRAND_STORAGE=r2` is set.

- **Catalog (T03, first slice):** admins, company heads, team leads,
  recruiters and reviewers open `/org/<slug>/catalog`; employees don't.
  It lists the courses, assessments and programs Klymb has published *and*
  granted to that company, finds them by purpose (upskilling or hiring; a
  recruiter lands on hiring, a team lead on upskilling), skill, kind and
  words, and shows each one at `/org/<slug>/catalog/<item>`: purpose,
  audience, level, length, outcomes, author, and a look inside (a course's
  lessons; a test's rubric summary, permitted tools and a practice task,
  never scoring rules or answers; a program's steps). Anything a company
  can't see, drafts included, is a 404.
  - Item details for Klymb's courses and assessments are in code
    (`src/data/business-catalog.ts`); publication state, skill tags,
    purposes, programs and grants are in the database (migration 0074) and
    set by a Klymb admin at `/admin/catalog`. Everything starts as a draft.
    One course serves every company granted it; nothing is copied.
  - The two assessments are **preview only**: their wording is a draft for
    Klymb to review, and nobody can take or be assigned them until T05.
    Assigning stays System Design only until T04.
  - Granting a program shows its published steps. A program can be
    published only when all its steps are, and a step can't be unpublished
    while a published program uses it.
  - Dev sign-in gives every Klymb item to the two dev companies but never
    publishes anything (previews share production's database): publish at
    `/admin/catalog` as Dev Admin.

- **Assignments (T04):** an admin assigns System Design to some people, a
  team or everyone; a team lead to people on their own team (`assignerFor`).
  Each assignment is required (optionally with a due date) or recommended.
  The Upskill page shows who it would reach, who is left out and why, the
  owner, the date and the seats before anything is written, then writes it
  once (`course.company_assignments` and `company_assignment_recipients`,
  migration 0075). The people are fixed at that moment: someone joining the
  team later isn't added. The database allows one live assignment per person
  and course, so a retried submit or two people assigning at once give
  nobody the course twice. Needs attention lists required assignments that
  are overdue or due within a week. Old 0030 rows moved over as required
  assignments, and a trigger keeps 0030's table in step for older code.
  The learner's /learn card says which company assigned it and its terms.
- **Practical assessments (T05):** a Klymb admin writes each test at
  `/admin/catalog/assessments/[slug]`: role, time allowed, what people hand
  in, tools, the real task, candidate instructions, a rubric (each area with
  a skill, points and a reviewer-only scoring guide), a practice task and
  what candidates see afterwards. The first draft starts from the catalog
  listing in `src/data/business-catalog.ts`; the real task and scoring
  guides are left for a person to write. Saving keeps a draft; publishing
  copies the saved draft into the next numbered version
  (`course.assessment_versions`, migration 0076), which a trigger stops
  anyone changing or deleting, and one draft revision makes at most one
  version. A company reviewer approves or declines (with a note Klymb sees)
  the newest version at `/org/[slug]/assessments`, and can see exactly what
  candidates will see, without the scoring guide. Recruiters use the newest
  approved version; a newer one waits for its own approval. Admins, company
  heads, recruiters and reviewers open Assessments; team leads and employees
  don't, since it shows the real task.
- **Hiring batches (T06):** a recruiter makes a batch at
  `/org/[slug]/hiring/new`: one test version the company approved (the
  newest such), the role, the reviewer, an optional prep course, when it
  opens and closes (written in a time zone they pick), and the candidates,
  pasted one per line or from a CSV, each with optional extra minutes. It
  saves as a draft and shows the first person's invitation exactly as it
  will arrive, and everyone's last start; nothing goes out until "Send".
  **Timing rule:** everyone who starts in time gets their full time, so the
  last start is the closing time minus their time allowed, unless a
  recruiter gave that one person a later one. The form, the invitation and
  the candidate's page show the last start apart from the time allowed.
  **Links:** each person's private link is `/assessment/<id>.<n>.<sig>`, an
  HMAC of their row and link number keyed by AUTH_SECRET; nothing secret is
  stored. Retrying a delivery sends the same link and adds nobody; "New
  link" bumps the number and the old one says it was replaced; a cancelled
  person or batch can't start. Changing AUTH_SECRET turns every link off.
  **Tracking:** each person shows Delivered, Failed (with the mail
  service's reason) or Not delivered, and every email is logged
  (`course.batch_mail_log`). Fix a failure with Retry, or Fix email (a new
  link to the corrected address). Recruiters can also remind, change one
  person's time (extra minutes and a later last start, emailed to them),
  send a new link, or cancel a person or the whole batch (no email). A send
  claims its rows first, so a double click or two recruiters send once.
  **Automatic reminder:** `/api/cron/batch-reminders`, daily at 09:00 India
  time (vercel.json), to people whose invitation was delivered and whose
  last start is within a day; once each. **Prep course:** System Design
  opens for an active candidate of a sent batch until it closes (or their
  later last start), on a Google-verified session with the invited email
  (`candidatePrep` in src/lib/access.ts), and their /learn card says which
  company opened it. Recruiters run batches; admins and company heads see
  them without the buttons. Outside production, links point at AUTH_URL so
  a test email opens the local server. Email needs MAIL_FROM and a provider
  key; set MAIL_REDIRECT_TO so every invite lands in one test inbox.
- **CSV import:** checked first (who will be added, who is already here,
  seats after, problems by line), then added. People already in the company
  are left as they are, so uploading the same file again adds nobody.
- **Dev sign-in:** Dev Lead leads the Engineering team at Dev Company, with
  Dev Employee on it. Dev Reviewer approves tests at Dev Company; Dev Both
  is a recruiter there. Run `npm run dev:test` so sign-in returns to the
  right port, or use port 3000, which `.env.local`'s AUTH_URL names.

## Not available (and shown as such in the UI)

Assigning anything other than System Design, assigning assessments, taking a
test (T07: the candidate's page shows the details but has no Start yet),
adding people to a batch after it is made, emailing candidates when they are
cancelled, emails telling reviewers a new version is waiting, reminder emails for due dates, company
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
`company.course_assign_all`, `company.assignment_create`,
`company.assessment_review` (the decision, never the note), and the
recruiter's `company.batch_create`, `company.batch_send`,
`company.batch_retry`, `company.batch_remind`, `company.batch_cancel`,
`company.candidate_cancel`, `company.candidate_new_link`,
`company.candidate_email` and `company.candidate_extend` (ids and counts,
never names or addresses). Klymb admins'
`catalog.assessment_save` and `catalog.assessment_publish` record the draft
revision and version number. Not logged: names, CSV contents, sign-in material.
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
idempotent. On 2026-11-10 a read-only check found it in `course.schema_migrations`
on Neon's `production` branch with a checksum matching this file. Not verified:
that Vercel's Production `DATABASE_URL` points at that branch.

**Numbering clash, fixed 2026-11-25:** main took 0047-0049 and 0069-0071 for
other work, and `tests/course-schema.test.ts` requires unique numbers, so this
branch's B2B migrations (once 0047-0071) are now 0072-0096, after main's last,
in the same order. None of main's migrations touch the B2B tables.

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

## B2B visual presentation

The company workspace calls its course area **Upskill** (My Upskill / Team Upskill for scoped views). Existing `/learning` URLs and actions stay compatible.

Prefer a short heading, an action and a visual summary over introductory paragraphs. Use rings for completion/coverage, bars for comparisons and stacked bars for exclusive statuses. Keep counts and labels readable without color or hover; use actual scoped data and explicit empty/unavailable states. Do not invent trends, improvement, scores or conversion stages that are not recorded. Keep essential instructions visible; put methodology and secondary help in accessible disclosures. Preserve full details in the relevant table or detail page. This direction applies across the B2B workspace and future screens.
