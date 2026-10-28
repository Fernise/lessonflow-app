alter table public.materials
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists materials_metadata_gin_idx
  on public.materials using gin (metadata);

create index if not exists materials_user_type_level_topic_idx
  on public.materials (user_id, exercise_type, level, topic);
