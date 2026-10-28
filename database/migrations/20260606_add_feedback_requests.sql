create extension if not exists "pgcrypto";

create table if not exists public.feedback_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null default '',
  type text not null check (type in ('Feedback', 'Bug Report', 'Feature Request', 'Account Deletion')),
  category text not null default 'General Feedback'
    check (category in ('Bug', 'Improvement', 'Missing Feature', 'General Feedback', 'Account Deletion')),
  subject text not null default '',
  message text not null default '',
  page text not null default '',
  page_url text not null default '',
  status text not null default 'new' check (status in ('new', 'reviewed', 'closed')),
  created_at timestamptz not null default now()
);

alter table public.feedback_requests
  add column if not exists category text not null default 'General Feedback',
  add column if not exists page text not null default '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'feedback_requests_category_check'
      and conrelid = 'public.feedback_requests'::regclass
  ) then
    alter table public.feedback_requests
      add constraint feedback_requests_category_check
      check (category in ('Bug', 'Improvement', 'Missing Feature', 'General Feedback', 'Account Deletion'));
  end if;
end $$;

create index if not exists feedback_requests_user_created_idx
  on public.feedback_requests (user_id, created_at desc);

create index if not exists feedback_requests_status_created_idx
  on public.feedback_requests (status, created_at desc);

alter table public.feedback_requests enable row level security;

drop policy if exists "feedback_requests_insert_own" on public.feedback_requests;
create policy "feedback_requests_insert_own"
on public.feedback_requests
for insert
with check (auth.uid() = user_id);

drop policy if exists "feedback_requests_select_own" on public.feedback_requests;
create policy "feedback_requests_select_own"
on public.feedback_requests
for select
using (auth.uid() = user_id);

drop policy if exists "feedback_requests_select_admin" on public.feedback_requests;
create policy "feedback_requests_select_admin"
on public.feedback_requests
for select
using ((auth.jwt() -> 'app_metadata' -> 'feedback_admin') = 'true'::jsonb);

notify pgrst, 'reload schema';
