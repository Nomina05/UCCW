-- UCCW: shared institutional calendar.
-- Safe to run more than once.
create table if not exists public.calendar_events (
  id uuid primary key,
  event_date date not null,
  event_type text not null default 'event',
  title text not null,
  assigned_to text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by text
);

create index if not exists calendar_events_date_idx on public.calendar_events (event_date);
create index if not exists calendar_events_type_idx on public.calendar_events (event_type);
alter table public.calendar_events enable row level security;

drop policy if exists "calendar_events_authenticated_read" on public.calendar_events;
create policy "calendar_events_authenticated_read" on public.calendar_events for select to authenticated using (true);
drop policy if exists "calendar_events_authenticated_write" on public.calendar_events;
create policy "calendar_events_authenticated_write" on public.calendar_events for insert to authenticated with check (true);
drop policy if exists "calendar_events_authenticated_update" on public.calendar_events;
create policy "calendar_events_authenticated_update" on public.calendar_events for update to authenticated using (true) with check (true);
drop policy if exists "calendar_events_authenticated_delete" on public.calendar_events;
create policy "calendar_events_authenticated_delete" on public.calendar_events for delete to authenticated using (true);
