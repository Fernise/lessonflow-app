-- Deliberate migration from a private email allowlist to server-managed authorization.
begin;
drop policy if exists "feedback_requests_select_admin" on public.feedback_requests;
create policy "feedback_requests_select_admin" on public.feedback_requests
  for select using ((auth.jwt() -> 'app_metadata' -> 'feedback_admin') = 'true'::jsonb);
commit;
