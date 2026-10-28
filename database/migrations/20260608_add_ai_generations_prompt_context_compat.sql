-- Compatibility fix for deployments that already use `input_context`.
-- The health check and legacy code paths also expect `prompt_context`.

alter table public.ai_generations
  add column if not exists prompt_context jsonb not null default '{}'::jsonb;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ai_generations'
      and column_name = 'input_context'
  ) then
    update public.ai_generations
    set prompt_context = input_context
    where prompt_context = '{}'::jsonb
      and input_context is not null;
  end if;
end $$;

notify pgrst, 'reload schema';
