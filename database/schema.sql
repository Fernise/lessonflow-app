-- LessonFlow production schema (canonical migration)
-- Architecture choice: use `student_memory` as the single teaching-memory source of truth.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  avatar_url text not null default '',
  auth_provider text not null default 'email',
  teaching_context text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  level text not null check (level in ('A2', 'B1', 'B2', 'C1')),
  native_language text not null default '',
  goals text[] not null default '{}',
  interests text[] not null default '{}',
  lesson_frequency text not null default '',
  notes text not null default '',
  last_lesson_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null unique references public.students(id) on delete cascade,
  recurring_mistakes text[] not null default '{}',
  grammar_weaknesses text[] not null default '{}',
  vocabulary_to_review text[] not null default '{}',
  pronunciation_notes text[] not null default '{}',
  speaking_confidence text not null default 'Developing'
    check (speaking_confidence in ('Low', 'Developing', 'Confident', 'Advanced')),
  listening_weaknesses text[] not null default '{}',
  preferred_topics text[] not null default '{}',
  avoided_topics text[] not null default '{}',
  repeated_topics text[] not null default '{}',
  strengths text[] not null default '{}',
  notes_for_next_class text not null default '',
  next_suggested_focus text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid references public.students(id) on delete set null,
  title text not null,
  level text not null check (level in ('A2', 'B1', 'B2', 'C1')),
  skill text not null default '',
  topic text not null default '',
  exercise_type text not null default '',
  summary text not null default '',
  content jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  material_id uuid references public.materials(id) on delete set null,
  lesson_date date not null default current_date,
  duration_minutes integer not null default 45,
  status text not null default 'planned'
    check (status in ('planned', 'completed', 'cancelled')),
  title text not null,
  focus text not null default '',
  topic text not null default '',
  skill_focus text not null default '',
  lesson_goal text not null default '',
  lesson_structure jsonb not null default '{}'::jsonb,
  topics_covered text[] not null default '{}',
  homework_assigned text not null default '',
  lesson_notes text not null default '',
  teacher_feedback text not null default '',
  student_performance text not null default '',
  new_mistakes_noticed text[] not null default '{}',
  vocabulary_to_review_next text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vocabulary_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  term text not null,
  definition text not null default '',
  example text not null default '',
  status text not null default 'review'
    check (status in ('new', 'review', 'mastered')),
  last_reviewed_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.weekly_preparations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  summary text not null default '',
  suggestions jsonb not null default '{}'::jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'prepared', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  material_id uuid references public.materials(id) on delete set null,
  material_type text not null default '',
  topic text not null default '',
  level text not null check (level in ('A2', 'B1', 'B2', 'C1')),
  skill_focus text not null default '',
  duration text not null default '',
  prompt_context jsonb not null default '{}'::jsonb,
  generated_content jsonb not null default '{}'::jsonb,
  variation integer not null default 1,
  created_at timestamptz not null default now()
);

-- Optional legacy table still used by transcript-generation endpoint.
create table if not exists public.lesson_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  input_text text not null,
  cefr_level text not null check (cefr_level in ('A2', 'B1', 'B2', 'C1')),
  result jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

-- Remove duplicate memory concept.
drop table if exists public.teaching_memory_items cascade;

create index if not exists students_user_updated_idx
  on public.students (user_id, updated_at desc);
create index if not exists student_memory_user_student_idx
  on public.student_memory (user_id, student_id);
create index if not exists lessons_user_student_date_idx
  on public.lessons (user_id, student_id, lesson_date desc);
create index if not exists materials_user_student_created_idx
  on public.materials (user_id, student_id, created_at desc);
create index if not exists materials_metadata_gin_idx
  on public.materials using gin (metadata);
create index if not exists materials_user_type_level_topic_idx
  on public.materials (user_id, exercise_type, level, topic);
create index if not exists vocabulary_user_student_status_idx
  on public.vocabulary_items (user_id, student_id, status);
create index if not exists weekly_preparations_user_week_idx
  on public.weekly_preparations (user_id, week_start desc);
create index if not exists ai_generations_user_student_created_idx
  on public.ai_generations (user_id, student_id, created_at desc);
create index if not exists lesson_generations_user_created_idx
  on public.lesson_generations (user_id, created_at desc);
create index if not exists feedback_requests_user_created_idx
  on public.feedback_requests (user_id, created_at desc);
create index if not exists feedback_requests_status_created_idx
  on public.feedback_requests (status, created_at desc);

alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.student_memory enable row level security;
alter table public.lessons enable row level security;
alter table public.materials enable row level security;
alter table public.vocabulary_items enable row level security;
alter table public.weekly_preparations enable row level security;
alter table public.ai_generations enable row level security;
alter table public.lesson_generations enable row level security;
alter table public.feedback_requests enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "students_select_own" on public.students;
create policy "students_select_own" on public.students for select using (auth.uid() = user_id);
drop policy if exists "students_insert_own" on public.students;
create policy "students_insert_own" on public.students for insert with check (auth.uid() = user_id);
drop policy if exists "students_update_own" on public.students;
create policy "students_update_own" on public.students for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "students_delete_own" on public.students;
create policy "students_delete_own" on public.students for delete using (auth.uid() = user_id);

drop policy if exists "student_memory_select_own" on public.student_memory;
create policy "student_memory_select_own" on public.student_memory for select using (auth.uid() = user_id);
drop policy if exists "student_memory_insert_own" on public.student_memory;
create policy "student_memory_insert_own" on public.student_memory for insert with check (auth.uid() = user_id);
drop policy if exists "student_memory_update_own" on public.student_memory;
create policy "student_memory_update_own" on public.student_memory for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "student_memory_delete_own" on public.student_memory;
create policy "student_memory_delete_own" on public.student_memory for delete using (auth.uid() = user_id);

drop policy if exists "lessons_select_own" on public.lessons;
create policy "lessons_select_own" on public.lessons for select using (auth.uid() = user_id);
drop policy if exists "lessons_insert_own" on public.lessons;
create policy "lessons_insert_own" on public.lessons for insert with check (auth.uid() = user_id);
drop policy if exists "lessons_update_own" on public.lessons;
create policy "lessons_update_own" on public.lessons for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "lessons_delete_own" on public.lessons;
create policy "lessons_delete_own" on public.lessons for delete using (auth.uid() = user_id);

drop policy if exists "materials_select_own" on public.materials;
create policy "materials_select_own" on public.materials for select using (auth.uid() = user_id);
drop policy if exists "materials_insert_own" on public.materials;
create policy "materials_insert_own" on public.materials for insert with check (auth.uid() = user_id);
drop policy if exists "materials_update_own" on public.materials;
create policy "materials_update_own" on public.materials for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "materials_delete_own" on public.materials;
create policy "materials_delete_own" on public.materials for delete using (auth.uid() = user_id);

drop policy if exists "vocabulary_select_own" on public.vocabulary_items;
create policy "vocabulary_select_own" on public.vocabulary_items for select using (auth.uid() = user_id);
drop policy if exists "vocabulary_insert_own" on public.vocabulary_items;
create policy "vocabulary_insert_own" on public.vocabulary_items for insert with check (auth.uid() = user_id);
drop policy if exists "vocabulary_update_own" on public.vocabulary_items;
create policy "vocabulary_update_own" on public.vocabulary_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "vocabulary_delete_own" on public.vocabulary_items;
create policy "vocabulary_delete_own" on public.vocabulary_items for delete using (auth.uid() = user_id);

drop policy if exists "weekly_prep_select_own" on public.weekly_preparations;
create policy "weekly_prep_select_own" on public.weekly_preparations for select using (auth.uid() = user_id);
drop policy if exists "weekly_prep_insert_own" on public.weekly_preparations;
create policy "weekly_prep_insert_own" on public.weekly_preparations for insert with check (auth.uid() = user_id);
drop policy if exists "weekly_prep_update_own" on public.weekly_preparations;
create policy "weekly_prep_update_own" on public.weekly_preparations for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "weekly_prep_delete_own" on public.weekly_preparations;
create policy "weekly_prep_delete_own" on public.weekly_preparations for delete using (auth.uid() = user_id);

drop policy if exists "ai_generations_select_own" on public.ai_generations;
create policy "ai_generations_select_own" on public.ai_generations for select using (auth.uid() = user_id);
drop policy if exists "ai_generations_insert_own" on public.ai_generations;
create policy "ai_generations_insert_own" on public.ai_generations for insert with check (auth.uid() = user_id);
drop policy if exists "ai_generations_update_own" on public.ai_generations;
create policy "ai_generations_update_own" on public.ai_generations for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "ai_generations_delete_own" on public.ai_generations;
create policy "ai_generations_delete_own" on public.ai_generations for delete using (auth.uid() = user_id);

drop policy if exists "lesson_generations_select_own" on public.lesson_generations;
create policy "lesson_generations_select_own" on public.lesson_generations for select using (auth.uid() = user_id);
drop policy if exists "lesson_generations_insert_own" on public.lesson_generations;
create policy "lesson_generations_insert_own" on public.lesson_generations for insert with check (auth.uid() = user_id);
drop policy if exists "lesson_generations_update_own" on public.lesson_generations;
create policy "lesson_generations_update_own" on public.lesson_generations for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "lesson_generations_delete_own" on public.lesson_generations;
create policy "lesson_generations_delete_own" on public.lesson_generations for delete using (auth.uid() = user_id);

drop policy if exists "feedback_requests_insert_own" on public.feedback_requests;
create policy "feedback_requests_insert_own" on public.feedback_requests for insert with check (auth.uid() = user_id);
drop policy if exists "feedback_requests_select_own" on public.feedback_requests;
create policy "feedback_requests_select_own" on public.feedback_requests for select using (auth.uid() = user_id);
drop policy if exists "feedback_requests_select_admin" on public.feedback_requests;
create policy "feedback_requests_select_admin" on public.feedback_requests
  for select using ((auth.jwt() -> 'app_metadata' -> 'feedback_admin') = 'true'::jsonb);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists set_students_updated_at on public.students;
create trigger set_students_updated_at before update on public.students for each row execute function public.set_updated_at();
drop trigger if exists set_student_memory_updated_at on public.student_memory;
create trigger set_student_memory_updated_at before update on public.student_memory for each row execute function public.set_updated_at();
drop trigger if exists set_lessons_updated_at on public.lessons;
create trigger set_lessons_updated_at before update on public.lessons for each row execute function public.set_updated_at();
drop trigger if exists set_materials_updated_at on public.materials;
create trigger set_materials_updated_at before update on public.materials for each row execute function public.set_updated_at();
drop trigger if exists set_vocabulary_items_updated_at on public.vocabulary_items;
create trigger set_vocabulary_items_updated_at before update on public.vocabulary_items for each row execute function public.set_updated_at();
drop trigger if exists set_weekly_preparations_updated_at on public.weekly_preparations;
create trigger set_weekly_preparations_updated_at before update on public.weekly_preparations for each row execute function public.set_updated_at();
drop trigger if exists set_lesson_generations_updated_at on public.lesson_generations;
create trigger set_lesson_generations_updated_at before update on public.lesson_generations for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';
