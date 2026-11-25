-- ─────────────────────────────────────────────────────────────
--  Assessment audience (U12): a company chooses whether a test is for
--  external candidates or internal employees when it creates the test.
--
--  This is deliberately stored on the assessment rather than selected for
--  each invitation. New rounds derive their existing `purpose` field from
--  this value, keeping decision rules, invitation emails and My assessments
--  consistent. Existing assessments are external by default.
-- ─────────────────────────────────────────────────────────────

alter table course.catalog_items
  add column if not exists assessment_audience text not null default 'external';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'catalog_items_assessment_audience') then
    alter table course.catalog_items add constraint catalog_items_assessment_audience
      check (assessment_audience in ('external', 'internal'));
  end if;
end
$$;
