-- A learner enrolled by email has no user_id until their first sign-in.
-- Without these policies the claim matched zero rows under RLS, so the app
-- reported "not enrolled" for someone who did have a place.

drop policy if exists "Claim my place" on public.learners;
create policy "Claim my place" on public.learners
  for update to authenticated
  using (user_id is null and lower(email) = lower(auth.jwt() ->> 'email'))
  with check (user_id = auth.uid() and lower(email) = lower(auth.jwt() ->> 'email'));

-- Read covers both states: already claimed, or claimable by verified email.
drop policy if exists "Learners read themselves" on public.learners;
drop policy if exists "Learners read their own place by email" on public.learners;
create policy "Learners read their own place by email" on public.learners
  for select to authenticated
  using (user_id = auth.uid() or (user_id is null and lower(email) = lower(auth.jwt() ->> 'email')));
