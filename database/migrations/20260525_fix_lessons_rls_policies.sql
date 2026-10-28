-- Fix lessons RLS policy drift/conflicts (authoritative reset).
-- Run in Supabase SQL editor (production/local) if lesson inserts still fail with 42501.

alter table public.lessons disable row level security;

-- Remove ALL policies on lessons, including unknown/restrictive leftovers.
do $$
declare
  policy_name text;
begin
  for policy_name in
    select polname
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'lessons'
  loop
    execute format('drop policy if exists %I on public.lessons', policy_name);
  end loop;
end $$;

alter table public.lessons enable row level security;
alter table public.lessons no force row level security;

-- Ensure table privileges exist for authenticated role.
grant select, insert, update, delete on table public.lessons to authenticated;

-- Recreate canonical permissive owner policies.
create policy "lessons_select_own"
on public.lessons
for select
to authenticated
using (auth.uid() = user_id);

create policy "lessons_insert_own"
on public.lessons
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "lessons_update_own"
on public.lessons
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "lessons_delete_own"
on public.lessons
for delete
to authenticated
using (auth.uid() = user_id);

notify pgrst, 'reload schema';
