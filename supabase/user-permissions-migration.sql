-- Per-user module permissions for UCCW.
-- NULL keeps the role template; a JSON object stores explicit module overrides.
create table if not exists public.user_records (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  profile text,
  active boolean not null default true,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.user_records enable row level security;
drop policy if exists "authenticated user records" on public.user_records;
create policy "authenticated user records" on public.user_records for all to authenticated using (true) with check (true);

alter table public.profiles
  add column if not exists permissions jsonb;

comment on column public.profiles.permissions is
  'Per-user overrides keyed by module with read, write, delete and download actions.';

-- Keep the current administrator on the complete Administrator template.
update public.profiles
set permissions = null,
    updated_at = now()
where email = 'huelmultiservices@gmail.com';

insert into public.user_records (id, email, profile, active, data)
select id, email, 'Administrator', true,
  jsonb_build_object(
    'id', id,
    'userId', 'U-00001',
    'profile', 'Administrator',
    'name', 'Administrator',
    'firstName', 'UCCW',
    'email', email,
    'active', 'Yes',
    'createdAt', created_at
  )
from auth.users
where lower(email) = 'huelmultiservices@gmail.com'
on conflict (email) do update set
  profile = excluded.profile,
  active = excluded.active,
  updated_at = now();
