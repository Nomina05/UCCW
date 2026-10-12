-- UCCW client service history. Run once in Supabase SQL Editor.
create table if not exists public.client_services (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  client_name text not null,
  service_category text not null,
  subservice text,
  service_status text not null default 'Requested'
    check (service_status in ('Requested', 'In Progress', 'Completed', 'Cancelled')),
  assigned_to text,
  follow_up_date date,
  comments text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_services_client_id_idx on public.client_services(client_id);
create index if not exists client_services_follow_up_idx on public.client_services(follow_up_date);
create index if not exists client_services_status_idx on public.client_services(service_status);

alter table public.client_services enable row level security;
drop policy if exists "authenticated client services" on public.client_services;
create policy "authenticated client services" on public.client_services
for all to authenticated using (true) with check (true);

