-- UCCW backup, continuity, retention, and synchronization history.
insert into storage.buckets (id, name, public, file_size_limit) values ('system-backups', 'system-backups', false, 52428800) on conflict (id) do update set public = false;
create table if not exists public.backup_runs (id uuid primary key default gen_random_uuid(), backup_date timestamptz not null default now(), storage_path text not null, record_count integer not null default 0, status text not null, triggered_by text, data jsonb not null default '{}'::jsonb);
create table if not exists public.continuity_events (id uuid primary key default gen_random_uuid(), event_type text not null, resource text, status text not null, actor_email text, details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create table if not exists public.continuity_settings (id uuid primary key default '00000000-0000-4000-8000-000000000002', schedule text not null default 'daily', retention_days integer not null default 30 check (retention_days between 1 and 3650), updated_at timestamptz not null default now());
insert into public.continuity_settings (id) values ('00000000-0000-4000-8000-000000000002') on conflict (id) do nothing;
create index if not exists backup_runs_date_idx on public.backup_runs (backup_date desc);
create index if not exists continuity_events_date_idx on public.continuity_events (created_at desc);
alter table public.backup_runs enable row level security; alter table public.continuity_events enable row level security; alter table public.continuity_settings enable row level security;
drop policy if exists "staff read backup history" on public.backup_runs; create policy "staff read backup history" on public.backup_runs for select to authenticated using (true);
drop policy if exists "staff read continuity events" on public.continuity_events; create policy "staff read continuity events" on public.continuity_events for select to authenticated using (true);
drop policy if exists "staff record continuity errors" on public.continuity_events; create policy "staff record continuity errors" on public.continuity_events for insert to authenticated with check (actor_email = coalesce(auth.jwt() ->> 'email', actor_email));
drop policy if exists "staff read continuity settings" on public.continuity_settings; create policy "staff read continuity settings" on public.continuity_settings for select to authenticated using (true);
