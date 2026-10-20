-- UCCW: administración avanzada de usuarios.
-- Ejecutar una vez en Supabase > SQL Editor.

alter table public.profiles
  add column if not exists blocked_at timestamptz,
  add column if not exists blocked_by text;

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

