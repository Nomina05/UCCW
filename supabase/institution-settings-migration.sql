-- Configuración institucional centralizada de UCCW.
create table if not exists public.institution_settings (
  id uuid primary key,
  organization_name text not null default 'UCCW',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by text
);

alter table public.institution_settings enable row level security;

drop policy if exists "Authenticated users can read institution settings" on public.institution_settings;
create policy "Authenticated users can read institution settings" on public.institution_settings for select to authenticated using (true);

drop policy if exists "Authenticated users can manage institution settings" on public.institution_settings;
create policy "Authenticated users can manage institution settings" on public.institution_settings for all to authenticated using (true) with check (true);

create or replace function public.touch_institution_settings_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

drop trigger if exists institution_settings_updated_at on public.institution_settings;
create trigger institution_settings_updated_at before update on public.institution_settings for each row execute function public.touch_institution_settings_updated_at();
