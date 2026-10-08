-- Ejecutar una sola vez después de schema.sql.
-- Conserva el formulario completo de cada registro en JSONB para permitir evolución del sistema.
alter table public.clients add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.donors add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.volunteers add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.service_records add column if not exists data jsonb not null default '{}'::jsonb;
