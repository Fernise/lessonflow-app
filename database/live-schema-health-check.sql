-- LessonFlow: CI-style live Supabase schema health check
-- Paste into Supabase SQL Editor and run.
-- Output:
--   1) One summary row: PASS or FAIL
--   2) Detailed failed checks (empty if PASS)

drop table if exists tmp_schema_health_failures;
create temporary table tmp_schema_health_failures (
  check_type text not null,
  object_name text not null,
  detail text not null
) on commit drop;

-- Required tables
with required_tables(table_name) as (
  values
    ('profiles'),
    ('students'),
    ('student_memory'),
    ('lessons'),
    ('materials'),
    ('vocabulary_items'),
    ('weekly_preparations'),
    ('ai_generations'),
    ('lesson_generations'),
    ('feedback_requests')
),
actual_tables as (
  select c.relname as table_name
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
)
insert into tmp_schema_health_failures (check_type, object_name, detail)
select
  'missing_table',
  rt.table_name,
  'Required table is missing in public schema.'
from required_tables rt
left join actual_tables at using (table_name)
where at.table_name is null;

-- Required columns (critical frontend contract)
with required_columns(table_name, column_name) as (
  values
    ('profiles', 'id'),
    ('profiles', 'full_name'),
    ('profiles', 'email'),
    ('profiles', 'avatar_url'),
    ('profiles', 'auth_provider'),
    ('profiles', 'teaching_context'),
    ('profiles', 'created_at'),
    ('profiles', 'updated_at'),

    ('students', 'id'),
    ('students', 'user_id'),
    ('students', 'name'),
    ('students', 'level'),
    ('students', 'native_language'),
    ('students', 'goals'),
    ('students', 'interests'),
    ('students', 'lesson_frequency'),
    ('students', 'notes'),
    ('students', 'last_lesson_at'),
    ('students', 'created_at'),
    ('students', 'updated_at'),

    ('student_memory', 'id'),
    ('student_memory', 'user_id'),
    ('student_memory', 'student_id'),
    ('student_memory', 'recurring_mistakes'),
    ('student_memory', 'grammar_weaknesses'),
    ('student_memory', 'vocabulary_to_review'),
    ('student_memory', 'pronunciation_notes'),
    ('student_memory', 'speaking_confidence'),
    ('student_memory', 'listening_weaknesses'),
    ('student_memory', 'preferred_topics'),
    ('student_memory', 'avoided_topics'),
    ('student_memory', 'repeated_topics'),
    ('student_memory', 'strengths'),
    ('student_memory', 'notes_for_next_class'),
    ('student_memory', 'next_suggested_focus'),
    ('student_memory', 'created_at'),
    ('student_memory', 'updated_at'),

    ('lessons', 'id'),
    ('lessons', 'user_id'),
    ('lessons', 'student_id'),
    ('lessons', 'material_id'),
    ('lessons', 'lesson_date'),
    ('lessons', 'duration_minutes'),
    ('lessons', 'status'),
    ('lessons', 'title'),
    ('lessons', 'topic'),
    ('lessons', 'skill_focus'),
    ('lessons', 'lesson_goal'),
    ('lessons', 'lesson_structure'),
    ('lessons', 'topics_covered'),
    ('lessons', 'homework_assigned'),
    ('lessons', 'lesson_notes'),
    ('lessons', 'teacher_feedback'),
    ('lessons', 'student_performance'),
    ('lessons', 'new_mistakes_noticed'),
    ('lessons', 'vocabulary_to_review_next'),
    ('lessons', 'created_at'),
    ('lessons', 'updated_at'),

    ('materials', 'id'),
    ('materials', 'user_id'),
    ('materials', 'student_id'),
    ('materials', 'title'),
    ('materials', 'level'),
    ('materials', 'skill'),
    ('materials', 'topic'),
    ('materials', 'exercise_type'),
    ('materials', 'summary'),
    ('materials', 'content'),
    ('materials', 'is_favorite'),
    ('materials', 'created_at'),
    ('materials', 'updated_at'),

    ('vocabulary_items', 'id'),
    ('vocabulary_items', 'user_id'),
    ('vocabulary_items', 'student_id'),
    ('vocabulary_items', 'term'),
    ('vocabulary_items', 'definition'),
    ('vocabulary_items', 'example'),
    ('vocabulary_items', 'status'),
    ('vocabulary_items', 'last_reviewed_at'),
    ('vocabulary_items', 'created_at'),
    ('vocabulary_items', 'updated_at'),

    ('weekly_preparations', 'id'),
    ('weekly_preparations', 'user_id'),
    ('weekly_preparations', 'week_start'),
    ('weekly_preparations', 'summary'),
    ('weekly_preparations', 'suggestions'),
    ('weekly_preparations', 'status'),
    ('weekly_preparations', 'created_at'),
    ('weekly_preparations', 'updated_at'),

    ('ai_generations', 'id'),
    ('ai_generations', 'user_id'),
    ('ai_generations', 'student_id'),
    ('ai_generations', 'material_id'),
    ('ai_generations', 'material_type'),
    ('ai_generations', 'topic'),
    ('ai_generations', 'level'),
    ('ai_generations', 'skill_focus'),
    ('ai_generations', 'duration'),
    ('ai_generations', 'prompt_context'),
    ('ai_generations', 'generated_content'),
    ('ai_generations', 'variation'),
    ('ai_generations', 'created_at'),

    ('lesson_generations', 'id'),
    ('lesson_generations', 'user_id'),
    ('lesson_generations', 'input_text'),
    ('lesson_generations', 'cefr_level'),
    ('lesson_generations', 'result'),
    ('lesson_generations', 'created_at'),
    ('lesson_generations', 'updated_at'),

    ('feedback_requests', 'id'),
    ('feedback_requests', 'user_id'),
    ('feedback_requests', 'email'),
    ('feedback_requests', 'category'),
    ('feedback_requests', 'type'),
    ('feedback_requests', 'subject'),
    ('feedback_requests', 'message'),
    ('feedback_requests', 'page'),
    ('feedback_requests', 'page_url'),
    ('feedback_requests', 'status'),
    ('feedback_requests', 'created_at')
),
actual_columns as (
  select table_name, column_name
  from information_schema.columns
  where table_schema = 'public'
)
insert into tmp_schema_health_failures (check_type, object_name, detail)
select
  'missing_column',
  rc.table_name || '.' || rc.column_name,
  'Required column is missing.'
from required_columns rc
left join actual_columns ac
  on ac.table_name = rc.table_name
 and ac.column_name = rc.column_name
where ac.column_name is null;

-- Required foreign keys (source column -> target column)
with required_fks as (
  select * from (
    values
      ('students', 'user_id', 'auth', 'users', 'id'),
      ('student_memory', 'user_id', 'auth', 'users', 'id'),
      ('student_memory', 'student_id', 'public', 'students', 'id'),
      ('lessons', 'user_id', 'auth', 'users', 'id'),
      ('lessons', 'student_id', 'public', 'students', 'id'),
      ('lessons', 'material_id', 'public', 'materials', 'id'),
      ('materials', 'user_id', 'auth', 'users', 'id'),
      ('materials', 'student_id', 'public', 'students', 'id'),
      ('vocabulary_items', 'user_id', 'auth', 'users', 'id'),
      ('vocabulary_items', 'student_id', 'public', 'students', 'id'),
      ('weekly_preparations', 'user_id', 'auth', 'users', 'id'),
      ('ai_generations', 'user_id', 'auth', 'users', 'id'),
      ('ai_generations', 'student_id', 'public', 'students', 'id'),
      ('ai_generations', 'material_id', 'public', 'materials', 'id'),
      ('lesson_generations', 'user_id', 'auth', 'users', 'id'),
      ('feedback_requests', 'user_id', 'auth', 'users', 'id')
  ) as t(src_table, src_column, target_schema, target_table, target_column)
),
actual_fks as (
  select
    src_ns.nspname as src_schema,
    src_table.relname as src_table,
    src_col.attname as src_column,
    target_ns.nspname as target_schema,
    target_table.relname as target_table,
    target_col.attname as target_column
  from pg_constraint fk
  join pg_class src_table on src_table.oid = fk.conrelid
  join pg_namespace src_ns on src_ns.oid = src_table.relnamespace
  join pg_class target_table on target_table.oid = fk.confrelid
  join pg_namespace target_ns on target_ns.oid = target_table.relnamespace
  join lateral unnest(fk.conkey) with ordinality as src_key(attnum, ord) on true
  join lateral unnest(fk.confkey) with ordinality as target_key(attnum, ord)
    on target_key.ord = src_key.ord
  join pg_attribute src_col
    on src_col.attrelid = fk.conrelid
   and src_col.attnum = src_key.attnum
  join pg_attribute target_col
    on target_col.attrelid = fk.confrelid
   and target_col.attnum = target_key.attnum
  where src_ns.nspname = 'public'
    and fk.contype = 'f'
)
insert into tmp_schema_health_failures (check_type, object_name, detail)
select
  'missing_foreign_key',
  rf.src_table || '.' || rf.src_column,
  'Expected FK to ' || rf.target_schema || '.' || rf.target_table || '(' || rf.target_column || ') is missing.'
from required_fks rf
left join actual_fks af
  on af.src_table = rf.src_table
 and af.src_column = rf.src_column
 and af.target_schema = rf.target_schema
 and af.target_table = rf.target_table
 and af.target_column = rf.target_column
where af.src_table is null;

-- RLS enabled for required app tables
with required_tables(table_name) as (
  values
    ('profiles'),
    ('students'),
    ('student_memory'),
    ('lessons'),
    ('materials'),
    ('vocabulary_items'),
    ('weekly_preparations'),
    ('ai_generations'),
    ('lesson_generations'),
    ('feedback_requests')
),
rls_status as (
  select c.relname as table_name, c.relrowsecurity as rls_enabled
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
)
insert into tmp_schema_health_failures (check_type, object_name, detail)
select
  'rls_not_enabled',
  rt.table_name,
  'RLS must be enabled on this table.'
from required_tables rt
left join rls_status rs using (table_name)
where coalesce(rs.rls_enabled, false) = false;

-- Required policies (name + command) from canonical schema
with required_policies(tablename, policyname, cmd) as (
  values
    ('profiles','profiles_select_own','SELECT'),
    ('profiles','profiles_insert_own','INSERT'),
    ('profiles','profiles_update_own','UPDATE'),
    ('students','students_select_own','SELECT'),
    ('students','students_insert_own','INSERT'),
    ('students','students_update_own','UPDATE'),
    ('students','students_delete_own','DELETE'),
    ('student_memory','student_memory_select_own','SELECT'),
    ('student_memory','student_memory_insert_own','INSERT'),
    ('student_memory','student_memory_update_own','UPDATE'),
    ('student_memory','student_memory_delete_own','DELETE'),
    ('lessons','lessons_select_own','SELECT'),
    ('lessons','lessons_insert_own','INSERT'),
    ('lessons','lessons_update_own','UPDATE'),
    ('lessons','lessons_delete_own','DELETE'),
    ('materials','materials_select_own','SELECT'),
    ('materials','materials_insert_own','INSERT'),
    ('materials','materials_update_own','UPDATE'),
    ('materials','materials_delete_own','DELETE'),
    ('vocabulary_items','vocabulary_select_own','SELECT'),
    ('vocabulary_items','vocabulary_insert_own','INSERT'),
    ('vocabulary_items','vocabulary_update_own','UPDATE'),
    ('vocabulary_items','vocabulary_delete_own','DELETE'),
    ('weekly_preparations','weekly_prep_select_own','SELECT'),
    ('weekly_preparations','weekly_prep_insert_own','INSERT'),
    ('weekly_preparations','weekly_prep_update_own','UPDATE'),
    ('weekly_preparations','weekly_prep_delete_own','DELETE'),
    ('ai_generations','ai_generations_select_own','SELECT'),
    ('ai_generations','ai_generations_insert_own','INSERT'),
    ('ai_generations','ai_generations_update_own','UPDATE'),
    ('ai_generations','ai_generations_delete_own','DELETE'),
    ('lesson_generations','lesson_generations_select_own','SELECT'),
    ('lesson_generations','lesson_generations_insert_own','INSERT'),
    ('lesson_generations','lesson_generations_update_own','UPDATE'),
    ('lesson_generations','lesson_generations_delete_own','DELETE'),
    ('feedback_requests','feedback_requests_insert_own','INSERT'),
    ('feedback_requests','feedback_requests_select_own','SELECT'),
    ('feedback_requests','feedback_requests_select_admin','SELECT')
)
insert into tmp_schema_health_failures (check_type, object_name, detail)
select
  'missing_policy',
  rp.tablename || '.' || rp.policyname,
  'Required policy with command ' || rp.cmd || ' is missing.'
from required_policies rp
left join pg_policies p
  on p.schemaname = 'public'
 and p.tablename = rp.tablename
 and p.policyname = rp.policyname
 and p.cmd = rp.cmd
where p.policyname is null;

-- Summary row (single row)
select
  case when exists (select 1 from tmp_schema_health_failures) then 'FAIL' else 'PASS' end as status,
  (select count(*) from tmp_schema_health_failures) as failed_checks,
  now() as checked_at;

-- Detailed failed checks (empty result means PASS)
select
  check_type,
  object_name,
  detail
from tmp_schema_health_failures
order by check_type, object_name;
