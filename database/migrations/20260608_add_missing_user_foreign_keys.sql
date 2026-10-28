-- LessonFlow: add missing user_id foreign keys to auth.users.
-- Safe for existing deployments where RLS works but physical FK constraints
-- were not created. Constraints are added NOT VALID so old orphaned rows do
-- not block the migration; PostgreSQL still enforces them for new rows.

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.students'::regclass and confrelid = 'auth.users'::regclass and conkey = array[(select attnum from pg_attribute where attrelid = 'public.students'::regclass and attname = 'user_id')]::smallint[] and contype = 'f') then
    alter table public.students
      add constraint students_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade not valid;
  end if;

  if not exists (select 1 from pg_constraint where conrelid = 'public.student_memory'::regclass and confrelid = 'auth.users'::regclass and conkey = array[(select attnum from pg_attribute where attrelid = 'public.student_memory'::regclass and attname = 'user_id')]::smallint[] and contype = 'f') then
    alter table public.student_memory
      add constraint student_memory_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade not valid;
  end if;

  if not exists (select 1 from pg_constraint where conrelid = 'public.lessons'::regclass and confrelid = 'auth.users'::regclass and conkey = array[(select attnum from pg_attribute where attrelid = 'public.lessons'::regclass and attname = 'user_id')]::smallint[] and contype = 'f') then
    alter table public.lessons
      add constraint lessons_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade not valid;
  end if;

  if not exists (select 1 from pg_constraint where conrelid = 'public.materials'::regclass and confrelid = 'auth.users'::regclass and conkey = array[(select attnum from pg_attribute where attrelid = 'public.materials'::regclass and attname = 'user_id')]::smallint[] and contype = 'f') then
    alter table public.materials
      add constraint materials_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade not valid;
  end if;

  if not exists (select 1 from pg_constraint where conrelid = 'public.vocabulary_items'::regclass and confrelid = 'auth.users'::regclass and conkey = array[(select attnum from pg_attribute where attrelid = 'public.vocabulary_items'::regclass and attname = 'user_id')]::smallint[] and contype = 'f') then
    alter table public.vocabulary_items
      add constraint vocabulary_items_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade not valid;
  end if;

  if not exists (select 1 from pg_constraint where conrelid = 'public.weekly_preparations'::regclass and confrelid = 'auth.users'::regclass and conkey = array[(select attnum from pg_attribute where attrelid = 'public.weekly_preparations'::regclass and attname = 'user_id')]::smallint[] and contype = 'f') then
    alter table public.weekly_preparations
      add constraint weekly_preparations_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade not valid;
  end if;

  if not exists (select 1 from pg_constraint where conrelid = 'public.ai_generations'::regclass and confrelid = 'auth.users'::regclass and conkey = array[(select attnum from pg_attribute where attrelid = 'public.ai_generations'::regclass and attname = 'user_id')]::smallint[] and contype = 'f') then
    alter table public.ai_generations
      add constraint ai_generations_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade not valid;
  end if;

  if not exists (select 1 from pg_constraint where conrelid = 'public.lesson_generations'::regclass and confrelid = 'auth.users'::regclass and conkey = array[(select attnum from pg_attribute where attrelid = 'public.lesson_generations'::regclass and attname = 'user_id')]::smallint[] and contype = 'f') then
    alter table public.lesson_generations
      add constraint lesson_generations_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade not valid;
  end if;

  if not exists (select 1 from pg_constraint where conrelid = 'public.feedback_requests'::regclass and confrelid = 'auth.users'::regclass and conkey = array[(select attnum from pg_attribute where attrelid = 'public.feedback_requests'::regclass and attname = 'user_id')]::smallint[] and contype = 'f') then
    alter table public.feedback_requests
      add constraint feedback_requests_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete set null not valid;
  end if;
end $$;

notify pgrst, 'reload schema';
