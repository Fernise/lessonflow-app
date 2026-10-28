-- Force-reset RLS policies for student_memory so authenticated users can write own rows.

alter table public.student_memory enable row level security;

do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'student_memory'
  loop
    execute format('drop policy if exists %I on public.student_memory', p.policyname);
  end loop;
end;
$$;

create policy "student_memory_select_own"
on public.student_memory
for select
to authenticated
using (auth.uid() = user_id);

create policy "student_memory_insert_own"
on public.student_memory
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "student_memory_update_own"
on public.student_memory
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "student_memory_delete_own"
on public.student_memory
for delete
to authenticated
using (auth.uid() = user_id);

notify pgrst, 'reload schema';
