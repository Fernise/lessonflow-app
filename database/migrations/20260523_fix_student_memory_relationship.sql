-- Ensure Supabase can resolve students -> student_memory relation in schema cache.
-- This migration is idempotent and safe to run multiple times.

alter table public.student_memory
  add column if not exists student_id uuid;

do $$
begin
  -- Drop any existing FK constraints on student_memory.student_id so we can recreate
  -- a single stable FK name used by embedded relation queries.
  if exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'student_memory'
      and c.contype = 'f'
      and c.conname <> 'student_memory_student_id_fkey'
      and exists (
        select 1
        from unnest(c.conkey) colnum
        join pg_attribute a on a.attrelid = c.conrelid and a.attnum = colnum
        where a.attname = 'student_id'
      )
  ) then
    execute (
      select string_agg(format('alter table public.student_memory drop constraint %I;', c.conname), ' ')
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public'
        and t.relname = 'student_memory'
        and c.contype = 'f'
        and c.conname <> 'student_memory_student_id_fkey'
        and exists (
          select 1
          from unnest(c.conkey) colnum
          join pg_attribute a on a.attrelid = c.conrelid and a.attnum = colnum
          where a.attname = 'student_id'
        )
    );
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'student_memory_student_id_fkey'
  ) then
    alter table public.student_memory
      add constraint student_memory_student_id_fkey
      foreign key (student_id) references public.students(id) on delete cascade;
  end if;
end;
$$;

alter table public.student_memory
  alter column student_id set not null;

create unique index if not exists student_memory_student_id_key
  on public.student_memory(student_id);

notify pgrst, 'reload schema';
