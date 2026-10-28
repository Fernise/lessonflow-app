-- Add user-facing profile metadata used by Google OAuth sign-in.
-- Run this once on existing Supabase projects before enabling Google login.

alter table public.profiles
  add column if not exists email text not null default '',
  add column if not exists avatar_url text not null default '',
  add column if not exists auth_provider text not null default 'email';
