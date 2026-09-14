# Klymb.ai — 30-Day Job Readiness Program

Frontend for Klymb.ai: a 30-day job-readiness program with five career tracks (QA Engineer, L1/L2 Support, Project Manager, Junior Developer, Reporting Analyst). Each track has daily practical problems, weekly assessments after Days 7/14/21/28, role-specific projects, interview preparation and mock interviews on Days 29–30.

> **Frontend foundation only.** No database, payments, authentication, email or external APIs are connected. Forms validate and show a local success state; nothing is saved. Learner pages use clearly labelled sample data.

## Setup

Requires Node.js 20.9+.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm start        # serve the production build
npm run lint
```

No environment variables are needed yet. When integrations are added, copy `.env.example` to `.env.local` (git-ignored) and set the same values in Vercel → Project Settings → Environment Variables. Never commit secrets.

## Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel, choose **Add New → Project** and import the repo. The Next.js preset is detected automatically (build command `npm run build`).
3. Deploy. No environment variables are required for the current frontend.

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
- [ ] Privacy Policy, Terms and Refund Policy pages.

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

- [ ] **Supabase** — store registrations, learners, submissions and progress
- [ ] **Razorpay** — payment step after registration (server-side order creation and signature verification; never trust client-side success)
- [ ] **Authentication** — learner sign-in (e.g. Supabase Auth, email OTP)
- [ ] **Real learner dashboard** — replace `src/data/demo.ts` with the signed-in learner's data
- [ ] **Assessment scoring** — reviewer workflow, rubric scores and feedback
- [ ] **Email or WhatsApp notifications** — registration confirmation, daily challenge reminders, assessment feedback
- [ ] **Admin dashboard** — manage cohorts, tracks, content, learners and reviews
