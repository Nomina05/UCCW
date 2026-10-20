-- UCCW monthly executive goals. Safe to run more than once.
create table if not exists public.report_goals (
  id uuid primary key,
  goal_month text not null,
  metric text not null,
  target_value numeric not null default 0,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by text,
  unique (goal_month, metric)
);
create index if not exists report_goals_month_idx on public.report_goals (goal_month);
alter table public.report_goals enable row level security;
drop policy if exists "report_goals_authenticated_all" on public.report_goals;
create policy "report_goals_authenticated_all" on public.report_goals for all to authenticated using (true) with check (true);
