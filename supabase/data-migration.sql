-- Ejecutar una sola vez después de schema.sql.
-- Conserva el formulario completo de cada registro en JSONB para permitir evolución del sistema.
alter table public.clients add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.donors add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.volunteers add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.service_records add column if not exists data jsonb not null default '{}'::jsonb;

-- Control de casos (ejecutar también para instalaciones que ya tienen schema.sql aplicado).
create table if not exists public.case_control (
  id uuid primary key default gen_random_uuid(),
  case_number text not null unique,
  client_name text,
  case_status text not null check (case_status in ('Abierto', 'En proceso', 'Cerrado')) default 'Abierto',
  assigned_to text,
  follow_up_date date,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.case_control enable row level security;
drop policy if exists "authenticated case control" on public.case_control;
create policy "authenticated case control" on public.case_control for all to authenticated using (true) with check (true);
