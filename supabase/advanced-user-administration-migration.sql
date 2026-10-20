-- UCCW: administración avanzada de usuarios.
-- Ejecutar una vez en Supabase > SQL Editor.

alter table public.profiles
  add column if not exists blocked_at timestamptz,
  add column if not exists blocked_by text,
  add column if not exists locked_until timestamptz;

create table if not exists public.login_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  successful boolean not null default false,
  reason text,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.login_attempts enable row level security;

-- Los intentos se escriben y consultan exclusivamente desde las rutas seguras
-- del servidor con la service role. No se concede acceso directo al navegador.
create index if not exists login_attempts_email_created_idx
  on public.login_attempts (lower(email), created_at desc);
create index if not exists login_attempts_user_created_idx
  on public.login_attempts (user_id, created_at desc);

create table if not exists public.security_settings (
  id text primary key default 'default' check (id = 'default'),
  min_password_length integer not null default 10 check (min_password_length between 8 and 64),
  require_uppercase boolean not null default true,
  require_lowercase boolean not null default true,
  require_number boolean not null default true,
  require_symbol boolean not null default true,
  max_failed_attempts integer not null default 5 check (max_failed_attempts between 3 and 20),
  lock_minutes integer not null default 15 check (lock_minutes between 5 and 1440),
  require_admin_mfa boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by text
);
insert into public.security_settings (id) values ('default') on conflict (id) do nothing;
alter table public.security_settings enable row level security;

create table if not exists public.security_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  alert_type text not null,
  severity text not null default 'medium',
  details jsonb not null default '{}'::jsonb,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.security_alerts enable row level security;
create index if not exists security_alerts_created_idx on public.security_alerts (created_at desc);

