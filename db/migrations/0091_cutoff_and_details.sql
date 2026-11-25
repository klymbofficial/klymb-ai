-- ─────────────────────────────────────────────────────────────
--  Cut-off and extra candidate details (U06b of the B2B plan,
--  U06_PROPOSAL.txt, approved 25 Nov: fields offered are phone, LinkedIn,
--  years of experience, current company, notice period, college and
--  graduation year)
--
--    company_test_settings.cutoff_percent   0–100, or null for none. Shown
--                                           to recruiters and reviewers as
--                                           cleared / below once reviewed;
--                                           never to candidates.
--    company_test_settings.collect          which details to ask before
--                                           Start (name and email always).
--    candidate_attempts.details             what the person gave at Start,
--                                           { field: value }; null when
--                                           nothing was asked. Removed with
--                                           the attempt.
--
--  Nullable or defaulted columns; the previous release never reads them.
--  Idempotent.
-- ─────────────────────────────────────────────────────────────

alter table course.company_test_settings add column if not exists cutoff_percent integer;
alter table course.company_test_settings add column if not exists collect text[] not null default '{}';
alter table course.candidate_attempts add column if not exists details jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'company_test_settings_cutoff') then
    alter table course.company_test_settings add constraint company_test_settings_cutoff
      check (cutoff_percent is null or cutoff_percent between 0 and 100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'company_test_settings_collect') then
    alter table course.company_test_settings add constraint company_test_settings_collect
      check (collect <@ array['phone', 'linkedin', 'experience', 'company', 'notice', 'college', 'graduation']::text[]);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'candidate_attempts_details') then
    alter table course.candidate_attempts add constraint candidate_attempts_details
      check (details is null or (jsonb_typeof(details) = 'object' and octet_length(details::text) <= 4000));
  end if;
end
$$;
