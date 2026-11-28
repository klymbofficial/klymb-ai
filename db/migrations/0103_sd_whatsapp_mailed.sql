-- ─────────────────────────────────────────────────────────────
--  System Design: who has had the WhatsApp group email
--
--  The group email used to go out once, from the admin panel, to every paid
--  seat at that moment. Anyone who enrolled later never got it. Now each seat
--  remembers when it was emailed, so:
--    · a new paid seat gets the email right after payment, and
--    · the admin panel sends it to every active seat that has not had it,
--  and nobody gets it twice.
--
--  Backfill: the seats the one-off send reached (paid seats that existed when
--  it went out) are marked with that send's time, so they are not emailed again.
--
--  Safe while the previous release is live: it adds a nullable column the old
--  code never reads.
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

alter table course.enrollments add column if not exists whatsapp_mailed_at timestamptz;

update course.enrollments e
   set whatsapp_mailed_at = first_send.at
  from (
    select min(at) as at from course.admin_audit_log
     where action = 'sd.whatsapp_announce' and target is null
  ) first_send
 where first_send.at is not null
   and e.course = 'system-design'
   and e.source = 'payment'
   and e.created_at <= first_send.at
   and e.whatsapp_mailed_at is null;
