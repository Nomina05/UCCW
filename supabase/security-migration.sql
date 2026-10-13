-- UCCW security, audit trail and recoverable deletion.
-- Run in Supabase SQL Editor after schema.sql and client-services-migration.sql.

alter table public.user_records drop constraint if exists user_records_profile_check;
update public.user_records set profile = case when lower(coalesce(profile, '')) like '%admin%' then 'Administrator' when lower(coalesce(profile, '')) like '%super%' then 'Supervisor' when lower(coalesce(profile, '')) like '%volunteer%' or lower(coalesce(profile, '')) like '%consult%' then 'Read Only' else 'Employee' end;
alter table public.user_records add constraint user_records_profile_check check (profile in ('Administrator', 'Supervisor', 'Employee', 'Read Only') or profile is null);

alter table public.clients add column if not exists deleted_at timestamptz;
alter table public.clients add column if not exists deleted_by text;
alter table public.case_control add column if not exists deleted_at timestamptz;
alter table public.case_control add column if not exists deleted_by text;
alter table public.user_records add column if not exists deleted_at timestamptz;
alter table public.user_records add column if not exists deleted_by text;
alter table public.donors add column if not exists deleted_at timestamptz;
alter table public.donors add column if not exists deleted_by text;
alter table public.volunteers add column if not exists deleted_at timestamptz;
alter table public.volunteers add column if not exists deleted_by text;
alter table public.service_records add column if not exists deleted_at timestamptz;
alter table public.service_records add column if not exists deleted_by text;
alter table public.client_services add column if not exists deleted_at timestamptz;
alter table public.client_services add column if not exists deleted_by text;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null check (action in ('create', 'update', 'import', 'delete', 'restore', 'download')),
  module text not null,
  resource text not null,
  record_id text,
  actor_email text not null,
  actor_user_id uuid,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.audit_logs drop constraint if exists audit_logs_action_check;
alter table public.audit_logs add constraint audit_logs_action_check check (action in ('create', 'update', 'import', 'delete', 'restore', 'download'));
create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at desc);
create index if not exists audit_logs_actor_idx on public.audit_logs(actor_email);
create index if not exists audit_logs_record_idx on public.audit_logs(resource, record_id);
alter table public.audit_logs enable row level security;
drop policy if exists "authenticated audit insert" on public.audit_logs;
drop policy if exists "authenticated audit read" on public.audit_logs;
create policy "authenticated audit insert" on public.audit_logs for insert to authenticated with check (true);
create policy "authenticated audit read" on public.audit_logs for select to authenticated using (true);

