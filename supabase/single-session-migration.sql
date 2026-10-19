-- One active device per authenticated user.
create table if not exists public.active_sessions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  session_id uuid not null,
  device_label text,
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.active_sessions enable row level security;

drop policy if exists "users manage own active session" on public.active_sessions;
create policy "users manage own active session"
on public.active_sessions
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists active_sessions_last_seen_idx
on public.active_sessions(last_seen);
