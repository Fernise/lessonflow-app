-- LessonFlow: One-shot live Supabase schema introspection
-- Paste this whole script into Supabase SQL Editor and run.
-- It returns multiple result sets, one per section.

-- 0) Expected app tables (for quick missing/extra detection)
with expected_tables(table_name) as (
  values
    ('profiles'),
    ('students'),
    ('student_memory'),
    ('lessons'),
    ('materials'),
    ('vocabulary_items'),
    ('weekly_preparations'),
    ('ai_generations'),
    ('lesson_generations')
),
actual_tables as (
  select c.relname as table_name
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
)
select
  'missing_expected_table' as status,
  e.table_name
from expected_tables e
left join actual_tables a using (table_name)
where a.table_name is null
union all
select
  'extra_public_table' as status,
  a.table_name
from actual_tables a
left join expected_tables e using (table_name)
where e.table_name is null
order by status, table_name;

-- 1) Tables in public schema
select
  n.nspname as schema_name,
  c.relname as table_name
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relname;

-- 2) Columns, types, nullability, defaults
select
  c.table_schema,
  c.table_name,
  c.ordinal_position,
  c.column_name,
  c.data_type,
  c.udt_name,
  c.is_nullable,
  c.column_default
from information_schema.columns c
where c.table_schema = 'public'
order by c.table_name, c.ordinal_position;

-- 3) Foreign keys
select
  tc.table_schema,
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_schema as foreign_table_schema,
  ccu.table_name as foreign_table_name,
  ccu.column_name as foreign_column_name
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
 and tc.table_schema = kcu.table_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
 and ccu.constraint_schema = tc.constraint_schema
where tc.table_schema = 'public'
  and tc.constraint_type = 'FOREIGN KEY'
order by tc.table_name, tc.constraint_name, kcu.ordinal_position;

-- 4) Indexes
select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;

-- 5) RLS enabled status per table
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relname;

-- 6) Policies
select
  p.schemaname,
  p.tablename,
  p.policyname,
  p.permissive,
  p.roles,
  p.cmd,
  p.qual,
  p.with_check
from pg_policies p
where p.schemaname = 'public'
order by p.tablename, p.policyname;

-- 7) Update triggers (set_updated_at)
select
  event_object_schema as schema_name,
  event_object_table as table_name,
  trigger_name,
  action_timing,
  event_manipulation,
  action_statement
from information_schema.triggers
where event_object_schema = 'public'
order by event_object_table, trigger_name;
