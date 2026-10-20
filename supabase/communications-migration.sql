-- UCCW communications, templates, delivery history and scheduling.
-- Safe to run more than once.
create table if not exists public.communication_templates (
  id uuid primary key,
  template_name text not null,
  channel text not null default 'email',
  language text not null default 'en',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by text
);
create table if not exists public.communications (
  id uuid primary key,
  client_id uuid,
  channel text not null,
  recipient text not null,
  subject text,
  delivery_status text not null default 'Draft',
  scheduled_at timestamptz,
  sent_at timestamptz,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by text
);
create index if not exists communications_client_idx on public.communications (client_id);
create index if not exists communications_scheduled_idx on public.communications (scheduled_at) where delivery_status = 'Scheduled';
create index if not exists communications_status_idx on public.communications (delivery_status, created_at desc);
alter table public.communication_templates enable row level security;
alter table public.communications enable row level security;
drop policy if exists "communication_templates_authenticated_all" on public.communication_templates;
create policy "communication_templates_authenticated_all" on public.communication_templates for all to authenticated using (true) with check (true);
drop policy if exists "communications_authenticated_all" on public.communications;
create policy "communications_authenticated_all" on public.communications for all to authenticated using (true) with check (true);

