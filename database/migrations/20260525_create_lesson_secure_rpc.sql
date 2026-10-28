-- Secure RPC for lesson creation when direct INSERT is blocked by policy drift.
-- Keeps ownership checks explicit and scoped to auth.uid().

create or replace function public.create_lesson_secure(
  p_user_id uuid,
  p_student_id uuid,
  p_material_id uuid,
  p_lesson_date date,
  p_duration_minutes integer,
  p_status text,
  p_title text,
  p_topic text,
  p_skill_focus text,
  p_lesson_goal text,
  p_lesson_structure jsonb,
  p_lesson_notes text,
  p_topics_covered text[]
)
returns table (
  id uuid,
  user_id uuid,
  student_id uuid,
  material_id uuid,
  lesson_date date,
  duration_minutes integer,
  status text,
  title text,
  topic text,
  skill_focus text,
  lesson_goal text,
  lesson_structure jsonb,
  lesson_notes text,
  homework_assigned text,
  student_performance text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_user uuid;
begin
  v_auth_user := auth.uid();
  if v_auth_user is null then
    raise exception 'Not authenticated';
  end if;

  if p_user_id <> v_auth_user then
    raise exception 'user_id mismatch';
  end if;

  if not exists (
    select 1 from public.students s
    where s.id = p_student_id and s.user_id = v_auth_user
  ) then
    raise exception 'student does not belong to authenticated user';
  end if;

  if p_material_id is not null and not exists (
    select 1 from public.materials m
    where m.id = p_material_id and m.user_id = v_auth_user
  ) then
    raise exception 'material does not belong to authenticated user';
  end if;

  return query
  insert into public.lessons (
    user_id,
    student_id,
    material_id,
    lesson_date,
    duration_minutes,
    status,
    title,
    topic,
    skill_focus,
    lesson_goal,
    lesson_structure,
    lesson_notes,
    topics_covered
  ) values (
    v_auth_user,
    p_student_id,
    p_material_id,
    p_lesson_date,
    coalesce(p_duration_minutes, 45),
    coalesce(nullif(p_status, ''), 'planned'),
    coalesce(nullif(p_title, ''), concat(coalesce(nullif(p_topic, ''), 'Lesson'), ' lesson')),
    coalesce(p_topic, ''),
    coalesce(p_skill_focus, ''),
    coalesce(p_lesson_goal, ''),
    coalesce(p_lesson_structure, '{}'::jsonb),
    coalesce(p_lesson_notes, ''),
    coalesce(p_topics_covered, '{}'::text[])
  )
  returning
    lessons.id,
    lessons.user_id,
    lessons.student_id,
    lessons.material_id,
    lessons.lesson_date,
    lessons.duration_minutes,
    lessons.status,
    lessons.title,
    lessons.topic,
    lessons.skill_focus,
    lessons.lesson_goal,
    lessons.lesson_structure,
    lessons.lesson_notes,
    lessons.homework_assigned,
    lessons.student_performance,
    lessons.created_at;
end;
$$;

revoke all on function public.create_lesson_secure(
  uuid, uuid, uuid, date, integer, text, text, text, text, text, jsonb, text, text[]
) from public;

grant execute on function public.create_lesson_secure(
  uuid, uuid, uuid, date, integer, text, text, text, text, text, jsonb, text, text[]
) to authenticated;

notify pgrst, 'reload schema';
