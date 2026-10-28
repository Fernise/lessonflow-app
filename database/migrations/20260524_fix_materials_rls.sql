-- Fix RLS for materials inserts with authenticated browser sessions.
-- Apply in Supabase SQL Editor (or via your migration runner) to align live DB policies.

alter table public.materials enable row level security;

drop policy if exists "materials_select_own" on public.materials;
drop policy if exists "materials_insert_own" on public.materials;
drop policy if exists "materials_update_own" on public.materials;
drop policy if exists "materials_delete_own" on public.materials;

create policy "materials_select_own"
on public.materials
for select
to authenticated
using (auth.uid() = user_id);

create policy "materials_insert_own"
on public.materials
for insert
to authenticated
with check (
  auth.uid() = user_id
  and (
    student_id is null
    or exists (
      select 1
      from public.students s
      where s.id = student_id
        and s.user_id = auth.uid()
    )
  )
);

create policy "materials_update_own"
on public.materials
for update
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and (
    student_id is null
    or exists (
      select 1
      from public.students s
      where s.id = student_id
        and s.user_id = auth.uid()
    )
  )
);

create policy "materials_delete_own"
on public.materials
for delete
to authenticated
using (auth.uid() = user_id);
