-- ─────────────────────────────────────────────────────────────
--  Removing company members, and one head per team
--
--  * removed_at: HR removes a person by stamping this, not by deleting the
--    row, so everything recorded against them stays. A removed person:
--      - has no access: the access check (src/lib/company/lookup.ts) and the
--        sign-in code store skip them, so it ends on their next click;
--      - frees their seat: seats count only rows with removed_at null;
--      - can be brought back by adding the same email to the same company.
--    The email stays the key, so a removed person still can't join a
--    different company.
--
--  * One head per team, among people not removed. An exclusion constraint
--    rather than a unique index so it can be DEFERRABLE: changing a team's
--    head demotes the old head and promotes the new one in one statement,
--    and the rule is checked once both rows have changed.
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

alter table course.company_members add column if not exists removed_at timestamptz;

create index if not exists company_members_active_idx
  on course.company_members (company_id, team_id) where removed_at is null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'company_members_one_head_per_team') then
    alter table course.company_members
      add constraint company_members_one_head_per_team
      exclude using btree (team_id with =) where (role = 'head' and removed_at is null)
      deferrable initially deferred;
  end if;
end $$;
