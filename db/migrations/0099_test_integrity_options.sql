-- ─────────────────────────────────────────────────────────────
--  Proctoring and plagiarism options (decided by the user 26 Nov 2026),
--  beside the switches 0095 added, per company and test:
--
--    proctor_shuffle    each candidate sees the questions, and each multiple-
--                       choice question's options, in their own order (fixed
--                       for their attempt). Answers are stored by question
--                       number and original option, so scoring is unchanged.
--    proctor_watermark  the candidate's email shows faintly across the test,
--                       so a screenshot or photo can be traced to them.
--    proctor_integrity  reviewers see an integrity index (0–100) worked out
--                       from the attempt's proctoring warnings.
--
--  New columns with defaults; the previous release reads none of them.
--  Idempotent.
-- ─────────────────────────────────────────────────────────────

alter table course.company_test_settings add column if not exists proctor_shuffle boolean not null default false;
alter table course.company_test_settings add column if not exists proctor_watermark boolean not null default false;
alter table course.company_test_settings add column if not exists proctor_integrity boolean not null default false;
