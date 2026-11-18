-- ─────────────────────────────────────────────────────────────
--  Sales: the new stages, and a one-line status note per lead
--
--  Stages are now: new → connected → interested ("Shown interest") →
--  follow_up ("Need follow-up") → signed / rejected.
--  Existing leads move: warm → connected; potential, positive, almost →
--  interested. New, signed and rejected stay.
--
--  The check still accepts the old names too, so the site keeps working in the
--  minutes between running this and the new code going live.
--
--  status_note is a short free-text line beside the stage ("call after
--  exams", "asked for EMI"), separate from the longer notes.
--
--  Run this BEFORE the code that uses it goes live. Idempotent.
-- ─────────────────────────────────────────────────────────────

alter table course.sales_leads drop constraint if exists sales_leads_stage_check;

update course.sales_leads set stage = 'connected' where stage = 'warm';
update course.sales_leads set stage = 'interested' where stage in ('potential', 'positive', 'almost');

alter table course.sales_leads add constraint sales_leads_stage_check
  check (stage in ('new', 'connected', 'interested', 'follow_up', 'signed', 'rejected',
                   'warm', 'potential', 'positive', 'almost'));

alter table course.sales_leads add column if not exists status_note text;

alter table course.sales_leads drop constraint if exists sales_leads_status_note_length;
alter table course.sales_leads add constraint sales_leads_status_note_length
  check (status_note is null or length(status_note) <= 120);
