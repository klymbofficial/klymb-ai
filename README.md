<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/brand/klymb-logo-white.svg">
    <img src="public/brand/klymb-logo.svg" alt="Klymb.ai" width="360">
  </picture>
</p>

# Klymb.ai — 30-Day Job Readiness Program

Frontend for Klymb.ai: a 30-day job-readiness program with five career tracks (QA Engineer, L1/L2 Support, Project Manager, Junior Developer, Reporting Analyst). Each track has daily practical problems, weekly assessments after Days 7/14/21/28, role-specific projects, interview preparation and mock interviews on Days 29–30.

> Data lives in the **`course` schema of the Neon database that also runs
> [app.klymb.ai](https://app.klymb.ai)** — one user base, so a learner here is the
> same person as the platform user with that address (`course.learners.user_id`
> references `public."User"`). Schema in `db/migrations/`, applied with
> `npm run db:migrate`. Supabase remains only as the message bus for the live
> device-switch sign-out; `supabase/migrations/` is the retired schema, kept as
> history and applied nowhere.

## Setup

Requires Node.js 20.9+.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm start        # serve the production build
npm run lint
```

Copy `.env.example` to `.env.local` (git-ignored) and set the same values in
Vercel → Project Settings → Environment Variables. Never commit secrets.
`DATABASE_URL` is the one the app cannot work without: see [`db/README.md`](db/README.md)
for how the schema and its role are set up.

## Security

| Control | Where |
| --- | --- |
| Identity is a Google-verified email, compared with exact equality | `src/auth.ts`, `src/lib/email.ts` |
| Admin status read from `admin_users` on every request, never from env or a token | `src/lib/admin/auth.ts` |
| Every query runs server-side; the browser holds no database credential | `src/lib/db/client.ts` |
| The app connects as `klymb_course`, which may only read and write the `course` schema, and may read just `(id, email)` of the platform's users | `db/migrations/0002_grants.sql` |
| Values are always bound parameters — the query tag has no way to inline a string as SQL | `src/lib/db/client.ts` |
| Registration throttle, keyed by a salted hash of the caller's IP | `src/lib/rate-limit.ts`, `src/lib/fingerprint.ts` |
| Server-side allowlists and length caps on every submitted field | `src/lib/validation.ts` |
| CSP, nosniff, Referrer-Policy, Permissions-Policy, frame-ancestors | `next.config.ts` |

**Content Security Policy.** These hosts must stay allowlisted or something breaks:
`www.googletagmanager.com` (analytics script), `www.google-analytics.com` and `*.analytics.google.com`
(measurement), `accounts.google.com` (sign-in redirect and form post), `*.supabase.co` (live device-switch channel),
`i.ytimg.com` (day-page thumbnails), `*.googleusercontent.com` (Google profile images).
`script-src` keeps `'unsafe-inline'` because Next.js inlines its bootstrap; `'unsafe-eval'` is added in
development only, for React Refresh.

**Verify everything:** `npm run verify` (types, lint, tests, production build).

## Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel, choose **Add New → Project** and import the repo. The Next.js preset is detected automatically (build command `npm run build`).
3. Set the environment variables from `.env.example` — at minimum `DATABASE_URL`,
   `AUTH_SECRET`, `AUTH_URL` and the Google OAuth pair — then deploy.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Homepage (story, tracks, how it works, journey, outcomes, pricing, FAQ, registration) |
| `/tracks` | All tracks + comparison table |
| `/tracks/[slug]` | Track detail page (same layout for all five tracks) |
| `/program` | Program structure and pricing |
| `/register?track=slug` | Registration form, optionally pre-selecting a track |
| `/dashboard?track=slug` | Learner progress dashboard (demo data) |
| `/daily-challenge?track=slug&day=n` | Daily problem view (demo) |
| `/weekly-assessment?track=slug&week=n` | Weekly assessment view (demo) |
| `/mock-interview?track=slug` | Mock interview preparation (demo) |
| `/contact`, `/privacy`, `/terms`, `/refund-policy` | Placeholders |

## Where to edit content

| File | What it controls |
| --- | --- |
| `src/data/config.ts` | **Prices, cohort start date, enrolment deadline, cohort capacity, contact email** |
| `src/data/tracks.ts` | All five tracks: skills, 4 weeks of daily challenges, assessments, projects, outcomes, interview topics and questions |
| `src/data/program.ts` | Homepage copy, sourced statistics, how-it-works steps, week phases, outcomes, FAQs, nav and footer links |
| `src/data/demo.ts` | Sample learner progress and placeholder rubric |
| `src/types/program.ts` | TypeScript data model |

### Before launch — verify

- [ ] `launchPrice` (₹14,999) and `referenceValue` (₹50,000) in `config.ts`. The reference value must reflect a genuine value breakdown; set `showReferenceValue: false` if it cannot be justified.
- [ ] `enrollmentDeadline` and `cohortCapacity` are **placeholders** — replace them and set the `...IsPlaceholder` flags to `false`.
- [ ] Re-check every statistic and its source link in `program.ts` (`evidence`).
- [ ] Final FAQ answers for track changes and refunds.
- [ ] Privacy Policy, Terms and Refund Policy pages..

Ethical guardrails used throughout: no fake testimonials, learner counts, seat counters or countdowns, and no guaranteed-job claims.

## Project structure

```
src/
├── app/                 Routes (see table above)
├── components/
│   ├── home/            Homepage sections + registration form
│   ├── track/           TrackCard, TrackGrid, TrackDetail, TrackCurriculum
│   ├── learn/           Dashboard/learning UI: TrackSwitcher, ProgressBar, WorkSubmission, InterviewPractice
│   ├── layout/          AnnouncementBar, Header, Footer, Wordmark
│   └── ui/              Button, Container, Eyebrow, SectionHeader, Tag, Reveal, FormField, PageHeader, SourceLink, DemoNotice
├── data/                All editable content and config
├── lib/                 Validation, formatting, 30-day helpers
└── types/               Data model
```

## TODO — next integrations

- [x] **Database** — registrations, learners, submissions, progress and payments, on the shared Neon instance
- [ ] **Razorpay** — payment step after registration (server-side order creation and signature verification; never trust client-side success)
- [x] **Authentication** — learner sign-in with Google, the verified email as the identity
- [ ] **Real learner dashboard** — replace `src/data/demo.ts` with the signed-in learner's data
- [ ] **Assessment scoring** — reviewer workflow, rubric scores and feedback
- [ ] **Email or WhatsApp notifications** — registration confirmation, daily challenge reminders, assessment feedback
- [ ] **Admin dashboard** — manage cohorts, tracks, content, learners and reviews..

## Brand assets

Logo files live in [`public/brand/`](public/brand) and are served from the site too (`https://www.klymb.ai/brand/<file>`):

| File | Use |
| --- | --- |
| `klymb-logo.svg` / `.png` | Wordmark on light backgrounds |
| `klymb-logo-white.svg` / `.png` | Wordmark on dark backgrounds |
| `klymb-logo-on-maroon.png` | Wordmark on the brand maroon, ready for social banners |
| `public/icons/icon-512.png` | Square app icon (K) |
| `profile-*.png` | Profile pictures for email and social accounts |

Wordmark: Archivo Black (900), letter-spacing −0.035em; "KLYMB" in ink `#201E1D`, ".AI" in brand red `#83050B` (`#F0868B` on dark).
