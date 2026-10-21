-- UCCW institutional training records.
create table if not exists public.training_records (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  start_date date,
  status text not null default 'Planned',
  instructor text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by text
);
create index if not exists training_records_start_date_idx on public.training_records(start_date desc);
create index if not exists training_records_status_idx on public.training_records(status);
alter table public.training_records enable row level security;
drop policy if exists "Authenticated users can read training" on public.training_records;
create policy "Authenticated users can read training" on public.training_records for select to authenticated using (true);
drop policy if exists "Authenticated users can manage training" on public.training_records;
create policy "Authenticated users can manage training" on public.training_records for all to authenticated using (true) with check (true);
